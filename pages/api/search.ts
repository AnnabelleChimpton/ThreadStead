import { apiHandler } from "@/lib/api/handler";
import { getThreadRingSystem } from "@/lib/api/ringhub/ringhub-middleware";
import {
  rankBySignals,
  ringTextRank,
  type Ranked,
  wordSimilarity,
  isExactName,
  type RelevanceSignals,
  type SearchResultType,
} from "@/lib/search/relevance";
import { decodeCursor, pageAfter } from "@/lib/search/cursor";
import { parseIntParam } from "@/lib/search/query";
import { fetchRings, ringResult, type RingRow } from "@/lib/search/rings";
import { buildExcerpt } from "@/lib/search/excerpt";
import { houseThumb, type SearchResult, type SearchSection } from "@/lib/search/types";
import {
  CANDIDATES_PER_TYPE,
  MAX_QUERY_LENGTH,
  postCandidates,
  userCandidates,
  pageCandidates,
  homeCandidates,
  hydratePosts,
  hydrateUsers,
  hydratePages,
  hydrateHomes,
} from "@/lib/search/local";
import { getUserBlockedIds, countHiddenComments, visibleCommentCount } from "@/lib/domain/users/blocks";

/**
 * GET /api/search?q&type=all|threadrings|users|posts|pages|homes&limit&cursor
 * GET /api/search?q&view=grouped&type=users,posts&per=5
 *
 * People, posts, custom pages and pixel homes come from Postgres full-text +
 * trigram search (lib/search/local.ts), with visibility and blocks in the
 * SQL. Rings come from RingHub. `type` takes one type or a comma list.
 *
 * Flat (default): everything blended into one order
 * (lib/search/relevance.ts), paged with a keyset cursor
 * (lib/search/cursor.ts): pass `nextCursor` back as `cursor`.
 *
 * Grouped (`view=grouped`, the /search page): each type ranked on its own,
 * `per` rows each plus how many matched, so the page can show a few of each
 * with "See all N". The page asks for rings separately so a slow hub never
 * holds up the local groups.
 */

type Display = Omit<SearchResult, "relevanceScore">;

interface RingCandidate extends RelevanceSignals {
  display: Display;
}

const TYPES = ["threadrings", "users", "posts", "pages", "homes"] as const;
type ApiType = (typeof TYPES)[number];
const ALLOWED_TYPES = ["all", ...TYPES];

/** API type name → result type. */
const RESULT_TYPE: Record<ApiType, SearchResultType> = {
  threadrings: "threadring",
  users: "user",
  posts: "post",
  pages: "page",
  homes: "home",
};

/** The hub returns at most this many rings per search. */
const RING_CANDIDATES = 50;

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
    const per = parseIntParam(req.query.per, "per", { fallback: 5, min: 1, max: 10 });
    const cursor = decodeCursor(req.query.cursor);
    const view = String(req.query.view || "flat");
    if (view !== "flat" && view !== "grouped") {
      return res.status(400).json({ error: `Invalid view "${view}" — expected flat or grouped` });
    }

    try {
      const query = String(req.query.q || "").trim().slice(0, MAX_QUERY_LENGTH);
      const type = String(req.query.type || "all");
      const requested = type.split(",").map((t) => t.trim()).filter(Boolean);

      // Unknown types used to silently return [] (e.g. type=threadring,
      // singular) — fail loudly instead.
      const unknown = requested.find((t) => !ALLOWED_TYPES.includes(t));
      if (unknown !== undefined || requested.length === 0) {
        return res.status(400).json({
          error: `Invalid type "${unknown ?? type}" — expected one of: ${ALLOWED_TYPES.join(", ")} (or a comma list)`,
        });
      }
      const types = new Set<ApiType>(requested.includes("all") ? TYPES : (requested as ApiType[]));

      if (!query) {
        return res.json(view === "grouped" ? { query, sections: {}, partial: false, errors: [] } : { results: [] });
      }

      const viewerId = viewer?.id ?? null;
      // Page 2+ scores with page 1's clock so recency can't reshuffle the order.
      const now = cursor?.t ?? Date.now();

      // Per-source failures are REPORTED, not swallowed: the old code caught
      // Ring Hub errors silently, so ring search read as "no results" for
      // months while every hub call failed.
      const sourceErrors: Array<{ source: string; message: string }> = [];

      const [rings, users, posts, pages, homes] = await Promise.all([
        types.has("threadrings") ? ringCandidates(query, viewerId, system, sourceErrors) : [],
        types.has("users") ? userCandidates(query, viewerId) : [],
        types.has("posts") ? postCandidates(query, viewerId) : [],
        types.has("pages") ? pageCandidates(query) : [],
        types.has("homes") ? homeCandidates(query, viewerId) : [],
      ]);
      const ringDisplay = new Map(rings.map((r) => [`threadring:${r.id}`, r.display]));

      if (view === "grouped") {
        const byType: Record<ApiType, RelevanceSignals[]> = { threadrings: rings, users, posts, pages, homes };
        const picked = [...types].map((t) => ({ t, ranked: rankBySignals(byType[t], now).slice(0, per) }));
        const display = await hydrate(picked.flatMap((p) => p.ranked), query, ringDisplay, viewerId);
        const sections: Partial<Record<ApiType, SearchSection>> = {};
        for (const { t, ranked } of picked) {
          const cap = t === "threadrings" ? RING_CANDIDATES : CANDIDATES_PER_TYPE;
          sections[t] = {
            results: withScores(ranked, display),
            total: byType[t].length,
            capped: byType[t].length >= cap,
          };
        }
        return res.json({ query, sections, partial: sourceErrors.length > 0, errors: sourceErrors });
      }

      const ranked = rankBySignals<RelevanceSignals>([...rings, ...users, ...posts, ...pages, ...homes], now);
      const { page, nextCursor } = pageAfter(ranked, cursor, limit, now);
      const results = withScores(page, await hydrate(page, query, ringDisplay, viewerId));

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
 * A row can vanish between ranking and hydration (deleted mid-request);
 * drop it rather than send a hole.
 */
function withScores(ranked: Ranked<RelevanceSignals>[], display: Map<string, Display>): SearchResult[] {
  return ranked.flatMap((r) => {
    const d = display.get(r.key);
    return d ? [{ ...d, relevanceScore: Math.round(r.score * 1000) / 10 }] : [];
  });
}

/** Display fields for the ranked rows that will actually be sent. */
async function hydrate(
  ranked: Ranked<RelevanceSignals>[],
  query: string,
  ringDisplay: Map<string, Display>,
  viewerId: string | null
): Promise<Map<string, Display>> {
  const idsOf = (t: SearchResultType) => ranked.filter((r) => r.item.type === t).map((r) => r.item.id);
  const [userRows, postRows, pageRows, homeRows] = await Promise.all([
    hydrateUsers(idsOf("user")),
    hydratePosts(idsOf("post")),
    hydratePages(idsOf("page")),
    hydrateHomes(idsOf("home")),
  ]);
  // Comment counts leave out people the viewer blocked (and replies under them)
  const blockedUserIds = viewerId && postRows.length > 0 ? (await getUserBlockedIds(viewerId)).blockedUserIds : [];
  const hiddenComments = await countHiddenComments(postRows.map((p) => p.id), blockedUserIds);

  const display = new Map(ringDisplay);
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
      person: {
        handle,
        avatarUrl: u.profile?.avatarThumbnailUrl || u.profile?.avatarUrl || null,
        house: u.homeConfig ? houseThumb(u.homeConfig) : null,
        postCount: u._count.posts,
        followerCount: u._count.followers,
      },
    });
  }
  for (const p of postRows) {
    const handle = p.author.handles[0]?.handle;
    if (!handle) continue;
    const authorName = p.author.profile?.displayName || handle;
    const ring = p.threadRings[0]?.threadRing ?? null;
    // bodyText is what's indexed (derived from the body when null); fall
    // back to the stored body for display, cleaned of markup.
    const source = p.bodyText || p.bodyMarkdown || p.bodyHtml || "";
    const commentCount = visibleCommentCount(p.id, p._count.comments, hiddenComments);
    display.set(`post:${p.id}`, {
      type: "post",
      id: p.id,
      title: p.title || "Untitled Post",
      description: buildExcerpt(source, query),
      url: `/resident/${handle}/post/${p.id}`,
      meta: `by ${authorName} • ${new Date(p.createdAt).toLocaleDateString()} • ${commentCount} comments`,
      post: {
        authorHandle: handle,
        authorName,
        createdAt: new Date(p.createdAt).toISOString(),
        ring: ring ? { name: ring.name, slug: ring.slug } : null,
        commentCount,
      },
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
  for (const h of homeRows) {
    const handle = h.user.handles[0]?.handle;
    if (!handle) continue;
    const ownerName = h.user.profile?.displayName || handle;
    display.set(`home:${h.userId}`, {
      type: "home",
      id: h.userId,
      title: h.houseTitle || h.houseBoardText || `${ownerName}'s home`,
      description: h.houseDescription || undefined,
      url: `/home/${handle}`,
      meta: `${ownerName}'s home`,
      home: { handle, ownerName, house: houseThumb(h) },
    });
  }
  return display;
}

/**
 * Rings stay hub-owned (SEARCH_PLAN.md §2): the hub filters and scores them,
 * and they're blended on the same scale as the Postgres candidates.
 */
async function ringCandidates(
  query: string,
  viewerId: string | null,
  system: string,
  sourceErrors: Array<{ source: string; message: string }>
): Promise<RingCandidate[]> {
  let rings: RingRow[];
  try {
    rings = await fetchRings({ search: query, viewerId, system, limit: RING_CANDIDATES });
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

  return rings.map((ring) => ({
    type: "threadring" as const,
    id: ring.id,
    // A full-text hub sends the same ts_rank_cd / word_similarity signals
    // Postgres gives posts and people; an older hub sends none, so estimate.
    textRank: ring.relevance?.textRank ?? ringTextRank(query, ring),
    trigram: ring.relevance?.trigram ?? Math.max(wordSimilarity(query, ring.name), wordSimilarity(query, ring.slug)),
    exact: isExactName(query, ring.name, ring.slug),
    activityAt: null,
    follows: false,
    sharedRing: false,
    display: ringResult(ring),
  }));
}
