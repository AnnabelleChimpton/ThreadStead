import { apiHandler } from "@/lib/api/handler";
import { curateRingPost, curateFailure } from "@/lib/rings/curate";

/**
 * Take a post out of a ring. `postId` is the hub's PostRef id: the hub owns
 * what's in a ring, and decides who may (the ring's host and moderators).
 */
export default apiHandler(
  { methods: ["DELETE"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user: viewer }) => {
    const { slug, postId } = req.query;
    const { reason } = req.body || {};
    if (typeof slug !== "string" || typeof postId !== "string") {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    try {
      await curateRingPost(viewer.id, slug, postId, "remove", typeof reason === "string" ? reason.slice(0, 500) : undefined);
      return res.json({ removed: true });
    } catch (error) {
      const [status, message] = curateFailure(error);
      return res.status(status).json({ error: message });
    }
  }
);
