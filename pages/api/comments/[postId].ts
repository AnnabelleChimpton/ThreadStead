// pages/api/comments/[postId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAction, classifyExternalPostId } from "@/lib/domain/users/capabilities";
import { createCommentNotification, createReplyNotification } from "@/lib/domain/notifications";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { updateCommentCount } from "@/lib/domain/posts/updateCommentCount";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  // Check local database first
  let post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });

  // If not found locally, it may be an external (RingHub) post. Only accept the
  // `ringhub-<PostRefId>` form the feed UI emits and derive the DB primary key
  // server-side, so a client can't upsert a shadow Post row with an arbitrary
  // attacker-chosen primary key. See classifyExternalPostId.
  let isExternalPost = false;
  if (!post) {
    const classified = classifyExternalPostId(postId);
    if (classified.kind !== "external") {
      return res.status(404).json({ error: "post not found" });
    }
    isExternalPost = true;
    // classified.dbId is server-controlled and, for a valid external id, equals postId.
    post = { id: classified.dbId, authorId: '' }; // Virtual post object
  }

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

    const wire = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      parentId: c.parentId,
      status: c.status,
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

      // For external posts, create a shadow record if needed
      if (isExternalPost) {
        // Get the current user to use as a placeholder author
        // The actual post content will still show from Ring Hub
        const currentUser = await db.user.findUnique({
          where: { id: authorId },
          select: { id: true }
        });

        if (!currentUser) {
          return res.status(401).json({ error: "User not found" });
        }

        // Create a minimal shadow post record for storing comments
        // This will only be created once per external post. Key off the
        // server-derived post.id (never the raw client-supplied query id).
        await db.post.upsert({
          where: { id: post.id },
          create: {
            id: post.id,
            bodyText: "[External Ring Hub Post - Comments Only]",
            visibility: "public",
            platform: "ringhub",
            authorId: authorId, // Use current user as placeholder
            title: "External Post"
          },
          update: {}, // Do nothing if it already exists
        });
      }

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

      // Create notifications (skip for external posts as they don't have real authors)
      try {
        if (parentId && created.parent?.authorId) {
          // This is a reply to another comment
          // Creating reply notification
          
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
        } else if (!isExternalPost) {
          // This is a top-level comment on a local post
          // Only create notification if it's not an external post
          // Creating comment notification
          
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

      // Update PostMetrics comment count
      await updateCommentCount(postId, 1);

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

// Apply CSRF protection and rate limiting (CSRF skips GET automatically)
export default withRateLimit('comments')(withCsrfProtection(handler));
