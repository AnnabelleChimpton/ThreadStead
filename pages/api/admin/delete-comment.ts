import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { updateCommentCount } from "@/lib/domain/posts/updateCommentCount";

export default apiHandler(
  { methods: ["DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const { commentId } = req.body;
    if (!commentId) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    try {
      const comment = await db.comment.findUnique({
        where: { id: commentId },
        include: {
          author: {
            select: {
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      await db.comment.delete({
        where: { id: commentId },
      });

      // Update PostMetrics comment count
      await updateCommentCount(comment.postId, -1);

      res.json({ 
        success: true,
        deletedComment: {
          id: comment.id,
          author: comment.author.profile?.displayName || comment.author.primaryHandle || "Unknown",
        },
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);