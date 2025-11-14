import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { updateCommentCount } from "@/lib/domain/posts/updateCommentCount";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

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

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));