import { apiHandler } from "@/lib/api/handler";
import { curateRingPost, curateFailure } from "@/lib/rings/curate";

/**
 * Pin (POST) or unpin (DELETE) a post in a ring. `postId` is the hub's
 * PostRef id: the hub owns pinning, and decides who may (the ring's host and
 * moderators), from the signer's role in the ring.
 */
export default apiHandler(
  { methods: ["POST", "DELETE"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user: viewer }) => {
    const { slug, postId } = req.query;
    if (typeof slug !== "string" || typeof postId !== "string") {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    try {
      const result = await curateRingPost(viewer.id, slug, postId, req.method === "POST" ? "pin" : "unpin");
      return res.json({ isPinned: !!result.post?.pinned });
    } catch (error) {
      const [status, message] = curateFailure(error);
      return res.status(status).json({ error: message });
    }
  }
);
