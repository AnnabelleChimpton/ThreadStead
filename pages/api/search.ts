import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getThreadRingSystem } from "@/lib/api/ringhub/ringhub-middleware";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { getUserBlockedIds } from "@/lib/domain/users/blocks";
import {
  rankBySignals,
  ringTextRank,
  wordSimilarity,
  isExactName,
  type RelevanceSignals,
  type SearchResultType,
} from "@/lib/search/relevance";
import { decodeCursor, pageAfter } from "@/lib/search/cursor";
import { escapeLike, parseIntParam } from "@/lib/search/query";
import { buildExcerpt } from "@/lib/search/excerpt";
import {
  CANDIDATES_PER_TYPE,
  MAX_QUERY_LENGTH,
  postCandidates,
  userCandidates,
  pageCandidates,
  hydratePosts,
  hydrateUsers,
  hydratePages,
} from "@/lib/search/local";

/**
 * GET /api/search?q&type=all|threadrings|users|posts|pages&limit&cursor
 *
 * People, posts and custom pages come from Postgres full-text + trigram
 * search (lib/search/local.ts), with visibility and blocks in the SQL. Rings
 * come from RingHub. Everything is blended into one order
 * (lib/search/relevance.ts) and paged with a keyset cursor
 * (lib/search/cursor.ts): pass `nextCursor` back as `cursor`.
 */

interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  description?: string;
  url: string;
  meta?: string;
  /** 0–100 blended relevance; 100+ for an exact name/title match. */
  relevanceScore: number;
}

interface RingCandidate extends RelevanceSignals {
  display: Omit<SearchResult, "relevanceScore">;
}

const ALLOWED_TYPES = ["all", "threadrings", "users", "posts", "pages"];

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    // Was withThreadRingSupport (which resolved the session a second time just
    // to pick the system); same feature-flag check, now on ctx.user.
    const system = getThreadRingSystem(viewer);
    if (system === 'none') {
      return res.status(404).json({ error: "ThreadRing features not available" });
    }

    // Bad numbers / cursors are a 400 (thrown ApiError), not a 500.
    const limit = parseIntParam(req.query.limit, "limit", { fallback: 20, min: 1, max: 50 });
    const cursor = decodeCursor(req.query.cursor);

    try {
      const query = String(req.query.q || "").trim().slice(0, MAX_QUERY_LENGTH);
      const type = String(req.query.type || "all");

      // Unknown types used to silently return [] (e.g. type=threadring,
      // singular) — fail loudly instead.
      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          error: `Invalid type "${type}" — expected one of: ${ALLOWED_TYPES.join(", ")}`,
        });
      }

      if (!query) {
        return res.json({ results: [] });
      }

      const wants = (t: string) => type === "all" || type === t;
      const viewerId = viewer?.id ?? null;
      // Page 2+ scores with page 1's clock so recency can't reshuffle the order.
      const now = cursor?.t ?? Date.now();

      // Per-source failures are REPORTED, not swallowed: the old code caught
      // Ring Hub errors silently, so ring search read as "no results" for
      // months while every hub call failed.
      const sourceErrors: Array<{ source: string; message: string }> = [];

      const [rings, users, posts, pages] = await Promise.all([
        wants("threadrings") ? ringCandidates(query, viewerId, system, sourceErrors) : [],
        wants("users") ? userCandidates(query, viewerId) : [],
        wants("posts") ? postCandidates(query, viewerId) : [],
        wants("pages") ? pageCandidates(query) : [],
      ]);

      const ranked = rankBySignals<RelevanceSignals>([...rings, ...users, ...posts, ...pages], now);
      const { page, nextCursor } = pageAfter(ranked, cursor, limit, now);

      const idsOf = (t: SearchResultType) => page.filter((r) => r.item.type === t).map((r) => r.item.id);
      const [userRows, postRows, pageRows] = await Promise.all([
        hydrateUsers(idsOf("user")),
        hydratePosts(idsOf("post")),
        hydratePages(idsOf("page")),
      ]);

      const display = new Map<string, Omit<SearchResult, "relevanceScore">>();
      for (const ring of rings as RingCandidate[]) display.set(`threadring:${ring.id}`, ring.display);
      for (const u of userRows) {
        const handle = u.handles[0]?.handle;
        if (!handle) continue;
        display.set(`user:${u.id}`, {
          type: "user",
          id: u.id,
          title: u.profile?.displayName || handle,
          description: u.profile?.bio || undefined,
          url: `/resident/${handle}`,
          meta: `@${handle} • ${u._count.posts} posts • ${u._count.followers} followers`,
        });
      }
      for (const p of postRows) {
        const handle = p.author.handles[0]?.handle;
        if (!handle) continue;
        // bodyText is what's indexed (derived from the body when null); fall
        // back to the stored body for display, cleaned of markup.
        const source = p.bodyText || p.bodyMarkdown || p.bodyHtml || "";
        display.set(`post:${p.id}`, {
          type: "post",
          id: p.id,
          title: p.title || "Untitled Post",
          description: buildExcerpt(source, query),
          url: `/resident/${handle}/post/${p.id}`,
          meta: `by ${p.author.profile?.displayName || handle} • ${new Date(p.createdAt).toLocaleDateString()} • ${p._count.comments} comments`,
        });
      }
      for (const c of pageRows) {
        display.set(`page:${c.id}`, {
          type: "page",
          id: c.id,
          title: c.title,
          description: buildExcerpt(c.content, query),
          url: `/page/${c.slug}`,
          meta: "Page",
        });
      }

      // A row can vanish between ranking and hydration (deleted mid-request);
      // drop it rather than send a hole.
      const results: SearchResult[] = page.flatMap((r) => {
        const d = display.get(r.key);
        return d ? [{ ...d, relevanceScore: Math.round(r.score * 1000) / 10 }] : [];
      });

      return res.json({
        results,
        query,
        type,
        total: results.length,
        nextCursor,
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

/**
 * Rings stay hub-owned (SEARCH_PLAN.md §2): the hub filters, this scores the
 * results on the same scale as the Postgres candidates.
 */
async function ringCandidates(
  query: string,
  viewerId: string | null,
  system: string,
  sourceErrors: Array<{ source: string; message: string }>
): Promise<RingCandidate[]> {
  const blockedThreadRingIds = viewerId ? (await getUserBlockedIds(viewerId)).blockedThreadRingIds : [];

  let rings: Array<{ id: string; slug: string; name: string; description?: string | null; memberCount?: number; postCount?: number }>;
  if (system === 'ringhub') {
    // Signed-in viewers get a user-signed client; anonymous ones the
    // UNSIGNED public client (signing as the instance DID gains nothing
    // here and fails every call when the hub can't resolve that key).
    const ringHubClient = viewerId ? createAuthenticatedRingHubClient(viewerId) : getPublicRingHubClient();
    if (!ringHubClient) {
      console.warn("Ring Hub client not configured, skipping ThreadRing search");
      sourceErrors.push({ source: "threadrings", message: "Ring Hub client not configured" });
      return [];
    }
    try {
      const ringResult = await ringHubClient.listRings({
        search: query,
        limit: 50,
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
      rings = ringResult.rings.filter((descriptor: any) => !blockedSlugs.has(descriptor.slug));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Ring Hub search failed:", {
        error: message,
        name: error instanceof Error ? error.name : undefined,
        query,
        authenticated: !!viewerId,
      });
      sourceErrors.push({ source: "threadrings", message });
      return [];
    }
  } else {
    // Local ThreadRing fallback (no hub): a substring filter, scored below.
    const pattern = escapeLike(query);
    rings = await db.threadRing.findMany({
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
      select: { id: true, name: true, slug: true, description: true, memberCount: true, postCount: true },
      orderBy: [{ memberCount: "desc" }, { postCount: "desc" }],
      take: CANDIDATES_PER_TYPE
    });
  }

  return rings.map((ring) => ({
    type: "threadring" as const,
    id: ring.id,
    textRank: ringTextRank(query, ring),
    trigram: Math.max(wordSimilarity(query, ring.name), wordSimilarity(query, ring.slug)),
    exact: isExactName(query, ring.name, ring.slug),
    activityAt: null,
    follows: false,
    sharedRing: false,
    display: {
      type: "threadring",
      id: ring.id,
      title: ring.name,
      description: ring.description || undefined,
      url: `/tr/${ring.slug}`,
      meta: `${ring.memberCount || 0} members • ${ring.postCount || 0} posts`,
    },
  }));
}
