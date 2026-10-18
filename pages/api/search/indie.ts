import { apiHandler } from "@/lib/api/handler";
import { parseIntParam } from "@/lib/search/query";
import { browseIndie, candidateSites, searchIndie } from "@/lib/search/indie";

const VIEWS = ["search", "browse", "candidates"] as const;

/**
 * GET /api/search/indie?q&limit&offset           search the Indie Index
 * GET /api/search/indie?view=browse&limit&offset  listed sites, newest post first
 * GET /api/search/indie?view=candidates           sites waiting for a second resident
 *
 * Results carry the card fields (tier, owner, matching posts, whether the
 * signed-in viewer vouched). See lib/search/indie.ts for the ranking.
 */
export default apiHandler(
  { methods: ["GET"], auth: "optional", rateLimit: "search" },
  async (req, res, { user: viewer }) => {
    const limit = parseIntParam(req.query.limit, "limit", { fallback: 20, min: 1, max: 50 });
    const offset = parseIntParam(req.query.offset, "offset", { fallback: 0, min: 0, max: 1000 });
    const view = String(req.query.view || "search");
    if (!VIEWS.includes(view as (typeof VIEWS)[number])) {
      return res.status(400).json({ error: `Invalid view "${view}" — expected one of: ${VIEWS.join(", ")}` });
    }
    const viewerId = viewer?.id ?? null;
    const page =
      view === "browse"
        ? await browseIndie({ limit, offset, viewerId })
        : view === "candidates"
          ? await candidateSites({ limit, offset, viewerId })
          : await searchIndie(String(req.query.q || ""), { limit, offset, viewerId });
    return res.json({ ...page, nextOffset: offset + page.results.length < page.total ? offset + page.results.length : null });
  }
);
