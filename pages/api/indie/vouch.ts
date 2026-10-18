import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { publicEnv } from "@/lib/config/public-env";
import { unvouch, vouchForSite, vouchForUrl } from "@/lib/indie-index/actions";

/**
 * POST   /api/indie/vouch { siteId }               vouch for a site in the index
 * POST   /api/indie/vouch { url, note? }           add a site by vouching for it
 * DELETE /api/indie/vouch { siteId }               take a vouch back
 *
 * A site is listed once two residents point at it (SEARCH_PLAN.md §3.5).
 */
export default apiHandler(
  { methods: ["POST", "DELETE"], auth: "user", rateLimit: "default" },
  async (req, res, { user }) => {
    const body = (req.body ?? {}) as { siteId?: unknown; url?: unknown; note?: unknown };
    const siteId = typeof body.siteId === "string" ? body.siteId : null;

    if (req.method === "DELETE") {
      if (!siteId) return res.status(400).json({ error: "siteId is required" });
      return res.json({ result: await unvouch(db, { userId: user.id, siteId }) });
    }
    if (siteId) return res.json({ result: await vouchForSite(db, { userId: user.id, siteId }) });
    if (typeof body.url !== "string" || !body.url.trim()) return res.status(400).json({ error: "Paste the site's address." });
    const result = await vouchForUrl(db, {
      userId: user.id,
      url: body.url.slice(0, 2000),
      note: typeof body.note === "string" ? body.note : null,
      baseUrl: publicEnv.NEXT_PUBLIC_BASE_URL || "https://homepageagain.com",
    });
    return res.json({ result });
  }
);
