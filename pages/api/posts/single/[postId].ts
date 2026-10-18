import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { canViewPost, getViewerRelationship } from "@/lib/domain/posts/visibility";




export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user: viewer }) => {
    const postId = String(req.query.postId || "");
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
                  avatarUrl: true,
                },
              },
            },
          },
          threadRings: {
            include: {
              threadRing: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        // Explicitly include all post fields including content warning fields
      });

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const authorId = post.authorId;

      // Check visibility permissions
      const canView =
        post.visibility === "public" ||
        canViewPost(post.visibility, await getViewerRelationship(viewer?.id, authorId));

      if (!canView) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ post });
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);