import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api/handler";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { hubWriteError, requireRingAs, ringManager } from "@/lib/domain/threadrings/ring-access";

const httpsUrl = z.string().url().refine((url) => url.startsWith("https://"), "The badge needs an https:// image address");

const schema = z.object({
  badgeImageUrl: httpsUrl.optional(),
  badgeImageHighResUrl: httpsUrl.optional(),
  updateExistingBadges: z.boolean().optional(),
});

/**
 * Set the ring's badge image on Ring Hub. The hub takes it from the ring's
 * Host, or from this site for a site admin (its isAdmin), and redraws the
 * badges members already have when asked.
 */
export default apiHandler(
  { methods: ["PUT"], auth: "user", rateLimit: "threadring_operations", schema },
  async (req, res, { user, body }) => {
    const slug = req.query.slug;
    if (typeof slug !== "string") throw new ApiError(400, "Invalid slug");
    const access = await requireRingAs(user, slug);
    const manager = ringManager(access, user.id);
    try {
      const result = await manager.updateRingBadge(slug, body);
      forgetRingReads(slug);
      res.json(result);
    } catch (error) {
      throw hubWriteError(error, access.manageAs);
    }
  }
);
