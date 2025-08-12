// pages/api/comments/[postId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAction } from "@/lib/capabilities";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return res.status(404).json({ error: "post not found" });

  if (req.method === "GET") {
    const comments = await db.comment.findMany({
      where: { postId, status: "visible" },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        author: {
          select: { id: true, primaryHandle: true, profile: { select: { avatarUrl: true } } },
        },
      },
    });

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

    try {
      const check = requireAction("write:comment", (resource) => resource === `post:${postId}/comments`);
      const verified = await check(String(cap || ""));
      const authorId = verified.sub!;

      const created = await db.comment.create({
        data: { content: content.trim(), postId, authorId, status: "visible" },
        include: {
          author: {
            select: { id: true, primaryHandle: true, profile: { select: { avatarUrl: true } } },
          },
        },
      });

      return res.status(201).json({
        comment: {
          id: created.id,
          content: created.content,
          createdAt: created.createdAt,
          author: {
            id: created.author?.id,
            handle: created.author?.primaryHandle ?? null,
            avatarUrl: created.author?.profile?.avatarUrl ?? null,
          },
        },
      });
    } catch {
      return res.status(401).json({ error: "invalid capability" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
