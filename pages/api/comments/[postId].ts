import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAction } from "@/lib/capabilities";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  // Ensure post exists and fetch visibility/author for checks if needed
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) return res.status(404).json({ error: "post not found" });

  if (req.method === "GET") {
    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        author: {
          select: { id: true, primaryHandle: true, profile: { select: { avatarUrl: true } } },
        },
      },
    });

    // map to a lighter shape similar to other endpoints
    const wire = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: {
        id: c.author?.id,
        handle: c.author?.primaryHandle ?? null,
        avatarUrl: c.author?.profile?.avatarUrl ?? null,
      },
    }));
    return res.json({ comments: wire });
  }

  if (req.method === "POST") {
    const { content, cap } = (req.body || {}) as { content?: string; cap?: string };
    if (!content || !content.trim()) return res.status(400).json({ error: "content required" });

    // Capability must authorize commenting on this post
    try {
      const check = requireAction("write:comment", (resource) => resource === `post:${postId}/comments`);
      const verified = await check(String(cap || ""));
      const authorId = verified.sub!;

      const comment = await db.comment.create({
        data: { content: content.trim(), postId, authorId },
        include: {
          author: {
            select: { id: true, primaryHandle: true, profile: { select: { avatarUrl: true } } },
          },
        },
      });

      return res.status(201).json({
        comment: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: {
            id: comment.author?.id,
            handle: comment.author?.primaryHandle ?? null,
            avatarUrl: comment.author?.profile?.avatarUrl ?? null,
          },
        },
      });
    } catch (e: any) {
      return res.status(401).json({ error: "invalid capability" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
