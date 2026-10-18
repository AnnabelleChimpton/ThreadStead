import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getThreadRingSystem } from "@/lib/api/ringhub/ringhub-middleware";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { getUserBlockedIds, addBlockFiltersToWhere } from "@/lib/domain/users/blocks";
import { rankSearchResults } from "@/lib/search/relevance";
import { escapeLike, parseIntParam } from "@/lib/search/query";
import { buildExcerpt } from "@/lib/search/excerpt";

interface SearchResult {
  type: 'threadring' | 'user' | 'post';
  id: string;
  title: string;
  description?: string;
  url: string;
  meta?: string;
  /** Extra names the ranker treats as the title (a user's handle). Not sent. */
  keys?: string[];
}

/**
 * Each source is read newest-first, so taking only `limit` rows per source
 * dropped exact matches that were older than the newest `limit` substring
 * hits ("love", "home" on prod). Read a wider candidate pool, plus a separate
 * exact-match query, and let the ranker pick.
 */
const CANDIDATES_PER_SOURCE = 100;

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
}

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    // Was withThreadRingSupport (which resolved the session a second time just
    // to pick the system); same feature-flag check, now on ctx.user.
    const system = getThreadRingSystem(viewer);
    if (system === 'none') {
      return res.status(404).json({ error: "ThreadRing features not available" });
    }

    // Bad numbers are a 400 (thrown ApiError), not a NaN that 500s.
    const limit = parseIntParam(req.query.limit, "limit", { fallback: 20, min: 1, max: 50 });

    try {
      const query = String(req.query.q || "").trim();
      const type = String(req.query.type || "all");

      // Unknown types used to silently return [] (e.g. type=threadring,
      // singular) — fail loudly instead.
      const ALLOWED_TYPES = ["all", "threadrings", "users", "posts"];
      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          error: `Invalid type "${type}" — expected one of: ${ALLOWED_TYPES.join(", ")}`,
        });
      }

      if (!query) {
        return res.json({ results: [] });
      }

      // Prisma sends `contains` AND insensitive `equals` as ILIKE without
      // escaping, so `%` used to match every row.
      const pattern = escapeLike(query);
      const { blockedUserIds, blockedThreadRingIds } = viewer
        ? await getUserBlockedIds(viewer.id)
        : { blockedUserIds: [] as string[], blockedThreadRingIds: [] as string[] };

      const results: SearchResult[] = [];
      // Per-source failures are REPORTED, not swallowed: the old code caught
      // Ring Hub errors silently, so ring search read as "no results" for
      // months while every hub call failed.
      const sourceErrors: Array<{ source: string; message: string }> = [];

      // Search ThreadRings
      if (type === 'all' || type === 'threadrings') {
        if (system === 'ringhub') {
          // Signed-in viewers get a user-signed client; anonymous ones the
          // UNSIGNED public client (signing as the instance DID gains nothing
          // here and fails every call when the hub can't resolve that key).
          const ringHubClient = viewer
            ? createAuthenticatedRingHubClient(viewer.id)
            : getPublicRingHubClient();

          if (ringHubClient) {
            try {
              const ringResult = await ringHubClient.listRings({
                search: query,
                limit,
                sort: 'members',
                order: 'desc'
              });

              // UserBlock points at the local ThreadRing row; hub descriptors
              // carry the hub's id, so match blocked rings by slug.
              const blockedSlugs = new Set(
                blockedThreadRingIds.length > 0
                  ? (await db.threadRing.findMany({
                      where: { id: { in: blockedThreadRingIds } },
                      select: { slug: true },
                    })).map((ring) => ring.slug)
                  : []
              );

              const threadRingResults = ringResult.rings
                .filter((descriptor: any) => !blockedSlugs.has(descriptor.slug))
                .map((descriptor: any) => ({
                  type: 'threadring' as const,
                  id: descriptor.id,
                  title: descriptor.name,
                  description: descriptor.description || undefined,
                  url: `/tr/${descriptor.slug}`,
                  meta: `${descriptor.memberCount || 0} members • ${descriptor.postCount || 0} posts`,
                  keys: [descriptor.slug],
                }));

              results.push(...threadRingResults);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              console.error("Ring Hub search failed:", {
                error: message,
                name: error instanceof Error ? error.name : undefined,
                query,
                authenticated: !!viewer,
              });
              sourceErrors.push({ source: "threadrings", message });
            }
          } else {
            console.warn("Ring Hub client not configured, skipping ThreadRing search");
            sourceErrors.push({ source: "threadrings", message: "Ring Hub client not configured" });
          }
        } else {
          // Local ThreadRing search fallback
          const threadRings = await db.threadRing.findMany({
            where: {
              AND: [
                { visibility: { in: ["public", "unlisted"] } },
                ...(blockedThreadRingIds.length > 0 ? [{ id: { notIn: blockedThreadRingIds } }] : []),
                {
                  OR: [
                    { name: { contains: pattern, mode: "insensitive" } },
                    { description: { contains: pattern, mode: "insensitive" } },
                    { slug: { contains: pattern, mode: "insensitive" } },
                  ]
                }
              ]
            },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              memberCount: true,
              postCount: true,
              createdAt: true
            },
            orderBy: [
              { memberCount: "desc" },
              { postCount: "desc" }
            ],
            take: CANDIDATES_PER_SOURCE
          });

          results.push(...threadRings.map(ring => ({
            type: 'threadring' as const,
            id: ring.id,
            title: ring.name,
            description: ring.description || undefined,
            url: `/tr/${ring.slug}`,
            meta: `${ring.memberCount} members • ${ring.postCount} posts`,
            keys: [ring.slug],
          })));
        }
      }

      // Search Users
      if (type === 'all' || type === 'users') {
        // Profiles that aren't public 403 on view — they mustn't show up here
        // with their bio. No profile row means public (as on the profile page).
        const visibleUser = {
          OR: [
            { profile: { is: null } },
            { profile: { is: { visibility: "public" as const } } },
            ...(viewer ? [{ id: viewer.id }] : []),
          ],
        };
        const notBlocked = blockedUserIds.length > 0 ? [{ id: { notIn: blockedUserIds } }] : [];
        const userInclude = {
          handles: {
            take: 1,
            orderBy: { handle: "asc" as const }
          },
          profile: {
            select: {
              displayName: true,
              bio: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              posts: {
                where: {
                  visibility: "public" as const
                }
              },
              followers: true
            }
          }
        };

        const [exactUsers, candidateUsers] = await Promise.all([
          db.user.findMany({
            where: {
              AND: [
                visibleUser,
                ...notBlocked,
                {
                  OR: [
                    { handles: { some: { handle: { equals: pattern, mode: "insensitive" } } } },
                    { profile: { is: { displayName: { equals: pattern, mode: "insensitive" } } } },
                  ]
                }
              ]
            },
            include: userInclude,
            take: limit
          }),
          db.user.findMany({
            where: {
              AND: [
                visibleUser,
                ...notBlocked,
                {
                  OR: [
                    { handles: { some: { handle: { contains: pattern, mode: "insensitive" } } } },
                    { profile: { is: { displayName: { contains: pattern, mode: "insensitive" } } } },
                    { profile: { is: { bio: { contains: pattern, mode: "insensitive" } } } },
                  ]
                }
              ]
            },
            include: userInclude,
            orderBy: [
              { createdAt: "desc" }
            ],
            take: CANDIDATES_PER_SOURCE
          }),
        ]);

        const transformedUsers = dedupeById([...exactUsers, ...candidateUsers])
          .filter(user => user.handles.length > 0)
          .map(user => ({
            type: 'user' as const,
            id: user.id,
            title: user.profile?.displayName || user.handles[0]?.handle || 'Unknown User',
            description: user.profile?.bio || undefined,
            url: `/resident/${user.handles[0]?.handle}`,
            meta: `@${user.handles[0]?.handle} • ${user._count.posts} posts • ${user._count.followers} followers`,
            keys: [user.handles[0].handle],
          }));

        results.push(...transformedUsers);
      }

      // Search Posts
      if (type === 'all' || type === 'posts') {
        // Only title, plain text and tags: matching bodyHtml/bodyMarkdown made
        // "href" and "nbsp" hit every post with a link or a space.
        const postWhere = (match: object) =>
          addBlockFiltersToWhere(
            { AND: [{ visibility: "public" }, match] },
            blockedUserIds,
            blockedThreadRingIds
          );
        const postInclude = {
          author: {
            include: {
              handles: {
                take: 1,
                orderBy: { handle: "asc" as const }
              },
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          _count: {
            select: {
              comments: {
                where: {
                  status: "visible" as const
                }
              }
            }
          }
        };

        const [exactPosts, candidatePosts] = await Promise.all([
          db.post.findMany({
            where: postWhere({ title: { equals: pattern, mode: "insensitive" } }),
            include: postInclude,
            orderBy: { createdAt: "desc" },
            take: limit
          }),
          db.post.findMany({
            where: postWhere({
              OR: [
                { title: { contains: pattern, mode: "insensitive" } },
                { bodyText: { contains: pattern, mode: "insensitive" } },
                {
                  // Prisma's `has` is exact + case-sensitive on array
                  // elements; cover the common casings since stored tags
                  // aren't guaranteed normalized.
                  tags: {
                    hasSome: Array.from(new Set([query, query.toLowerCase(), query.toUpperCase()]))
                  }
                }
              ]
            }),
            include: postInclude,
            orderBy: { createdAt: "desc" },
            take: CANDIDATES_PER_SOURCE
          }),
        ]);

        const transformedPosts = dedupeById([...exactPosts, ...candidatePosts])
          .filter(post => post.author.handles.length > 0)
          .map(post => {
            const authorHandle = post.author.handles[0]?.handle;
            const authorName = post.author.profile?.displayName || authorHandle;
            // bodyText is the match field; fall back to the stored body for
            // display only, cleaned of tags, entities and image remnants.
            const source = post.bodyText || post.bodyMarkdown || post.bodyHtml || "";
            const timeAgo = new Date(post.createdAt).toLocaleDateString();

            return {
              type: 'post' as const,
              id: post.id,
              title: post.title || 'Untitled Post',
              description: buildExcerpt(source, query),
              url: `/resident/${authorHandle}/post/${post.id}`,
              meta: `by ${authorName} • ${timeAgo} • ${post._count.comments} comments`
            };
          });

        results.push(...transformedPosts);
      }

      // Rank by relevance (the old code SHUFFLED type=all results, burying
      // exact matches under keyword mentions). Exact title match first, then
      // prefix/word/substring, with a small type weight (ring > user > post).
      const ranked = rankSearchResults(results, query, limit).map(({ keys: _keys, ...result }) => result);

      return res.json({
        results: ranked,
        query,
        type,
        total: ranked.length,
        // Sources that errored during this search — the UI shows a degraded
        // notice instead of pretending "no results".
        partial: sourceErrors.length > 0,
        errors: sourceErrors
      });

    } catch (error) {
      console.error("Error performing search:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
