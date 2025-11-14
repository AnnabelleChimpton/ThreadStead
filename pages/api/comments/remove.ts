import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { updateCommentCount } from "@/lib/domain/posts/updateCommentCount";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

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

// Apply CSRF protection and rate limiting
export default withRateLimit('comments')(withCsrfProtection(handler));
