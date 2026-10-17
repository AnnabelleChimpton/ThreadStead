import { db } from "@/lib/config/database/connection";
import { removePostFromRingHub } from "@/lib/domain/posts/ringhub-removal";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    try {
      const post = await db.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          threadRings: {
            include: {
              threadRing: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Remove the hub PostRefs before the local post goes. The hub only lets
      // the author (or a ring moderator) curate a PostRef, so this is signed as
      // the post's author, not the admin or the server. Never blocks deletion.
      const { synced: ringHubSynced } = await removePostFromRingHub(
        post,
        `Post deleted by admin: ${adminUser.primaryHandle || adminUser.id}`
      );

      // Delete the post from local database (cascade will handle PostThreadRing associations)
      await db.post.delete({
        where: { id: postId },
      });

      res.json({
        success: true,
        ringHubSynced,
        deletedPost: {
          id: post.id,
          author: post.author.profile?.displayName || post.author.primaryHandle || "Unknown",
          threadRingsRemoved: post.threadRings.map(ptr => ptr.threadRing.name),
        },
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  }
);