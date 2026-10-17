import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { updateCommentCount } from "@/lib/domain/posts/updateCommentCount";

// CSRF protection and rate limiting come from apiHandler
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "comments" },
  async (req, res, { user: viewer }) => {
    const { commentId } = (req.body || {}) as { commentId?: string };
    if (!commentId) return res.status(400).json({ error: "commentId required" });

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) return res.status(404).json({ error: "comment not found" });

    const isPostOwner = comment.post.authorId === viewer.id;
    const isCommentAuthor = comment.authorId === viewer.id;
    if (!(isPostOwner || isCommentAuthor)) return res.status(403).json({ error: "forbidden" });

    await db.comment.update({
      where: { id: commentId },
      data: { status: "hidden" },
    });

    // Update PostMetrics comment count
    await updateCommentCount(comment.postId, -1);

    return res.json({ ok: true });
  }
);
