// pages/api/comments/[postId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAction } from "@/lib/capabilities";
import { createCommentNotification, createReplyNotification } from "@/lib/notifications";

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
      parentId: c.parentId,
      author: {
        id: c.author?.id,
        handle: c.author?.primaryHandle ?? null,
        avatarUrl: c.author?.profile?.avatarUrl ?? null,
      },
    }));
    return res.json({ comments: wire });
  }

  if (req.method === "POST") {
    const { content, cap, parentId } = (req.body || {}) as { content?: string; cap?: string; parentId?: string };
    if (!content || !content.trim()) return res.status(400).json({ error: "content required" });

    // Validate parentId if provided
    if (parentId) {
      const parentComment = await db.comment.findUnique({ 
        where: { id: parentId },
        select: { id: true, postId: true }
      });
      if (!parentComment || parentComment.postId !== postId) {
        return res.status(400).json({ error: "invalid parentId" });
      }
    }

    try {
      const check = requireAction("write:comment", (resource) => resource === `post:${postId}/comments`);
      const verified = await check(String(cap || ""));
      const authorId = verified.sub!;

      const created = await db.comment.create({
        data: { 
          content: content.trim(), 
          postId, 
          authorId, 
          parentId: parentId || null,
          status: "visible" 
        },
        include: {
          author: {
            select: { id: true, primaryHandle: true, profile: { select: { avatarUrl: true } } },
          },
          post: {
            select: { authorId: true },
          },
          parent: {
            select: { authorId: true },
          },
        },
      });

      // Create notifications
      try {
        if (parentId && created.parent?.authorId) {
          // This is a reply to another comment
          console.log(`Creating reply notification: ${authorId} replied to ${created.parent.authorId}`);
          
          // Get post author's handle for the notification link
          const postAuthor = await db.user.findUnique({
            where: { id: created.post.authorId },
            select: { primaryHandle: true }
          });
          
          await createReplyNotification(
            created.parent.authorId,
            authorId,
            postId,
            created.id,
            parentId,
            postAuthor?.primaryHandle
          );
        } else {
          // This is a top-level comment on a post
          console.log(`Creating comment notification: ${authorId} commented on post by ${created.post.authorId}`);
          
          // Get post author's handle for the notification link
          const postAuthor = await db.user.findUnique({
            where: { id: created.post.authorId },
            select: { primaryHandle: true }
          });
          
          await createCommentNotification(
            created.post.authorId,
            authorId,
            postId,
            created.id,
            postAuthor?.primaryHandle
          );
        }
      } catch (notificationError) {
        console.error("Failed to create comment notification:", notificationError);
        // Don't fail the comment creation if notification fails
      }

      return res.status(201).json({
        comment: {
          id: created.id,
          content: created.content,
          createdAt: created.createdAt,
          parentId: created.parentId,
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
