import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { updateCommentCount } from "@/lib/domain/posts/updateCommentCount";
import { z } from "zod";

// CSRF protection and rate limiting come from apiHandler
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "comments", schema: z.object({ commentId: z.string().min(1).max(200) }) },
  async (req, res, { user: viewer, body: { commentId } }) => {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) return res.status(404).json({ error: "comment not found" });

    const isPostOwner = comment.post.authorId === viewer.id;
    const isCommentAuthor = comment.authorId === viewer.id;
    if (!(isPostOwner || isCommentAuthor)) return res.status(403).json({ error: "forbidden" });

    // Only a visible one is taken off the count: removing it twice (a
    // double click, a retry) took one off each time, and the count drifted
    const hidden = await db.comment.updateMany({
      where: { id: commentId, status: "visible" },
      data: { status: "hidden" },
    });
    if (hidden.count === 1) await updateCommentCount(comment.postId, -1);

    return res.json({ ok: true });
  }
);
