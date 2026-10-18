import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { optOutSite } from "@/lib/indie-index/actions";

/**
 * POST /api/indie/opt-out { siteId }
 *
 * Takes a resident's own site out of the Indie Index for good (or any site,
 * for the admin). Other site owners opt out with robots.txt or a noindex
 * meta tag; see /indie/about.
 */
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "default" },
  async (req, res, { user }) => {
    const siteId = typeof req.body?.siteId === "string" ? req.body.siteId : null;
    if (!siteId) return res.status(400).json({ error: "siteId is required" });
    return res.json(await optOutSite(db, { siteId, by: { id: user.id, role: user.role } }));
  }
);
