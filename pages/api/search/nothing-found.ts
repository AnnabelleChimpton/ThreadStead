import { apiHandler } from "@/lib/api/handler";
import { MAX_QUERY_LENGTH } from "@/lib/search/local";
import { closestRings, randomHomes } from "@/lib/search/discover";

/**
 * GET /api/search/nothing-found?q
 *
 * What /search shows when a query finds nothing: the closest rings (by the
 * query's single words, else the biggest rings) and a few random homes.
 * Fetched only after a search comes back empty, never as you type.
 */
export default apiHandler(
  { methods: ["GET"], auth: "optional", rateLimit: "search" },
  async (req, res, { user: viewer }) => {
    const query = String(req.query.q || "").trim().slice(0, MAX_QUERY_LENGTH);
    const viewerId = viewer?.id ?? null;

    const [rings, homes] = await Promise.all([
      closestRings(query, viewerId),
      randomHomes(viewerId, 3),
    ]);
    return res.json({ query, rings: rings.rings, ringsAreFallback: rings.fallback, homes });
  }
);
