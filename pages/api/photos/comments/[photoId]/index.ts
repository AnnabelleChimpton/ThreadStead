import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { requireAction } from "@/lib/domain/users/capabilities";
import { createNotification } from "@/lib/domain/notifications";
import { apiHandler, type SessionUser } from "@/lib/api/handler";
import { sendUnauthenticated } from "@/lib/api/errors";
import { getHiddenIds, filterBlockedComments } from "@/lib/domain/users/blocks";

// GET is public; POST checks the session itself (CSRF only applies to POST)
export default apiHandler(
  { methods: ["GET", "POST"], auth: "optional", rateLimit: "comments" },
  async (req, res, { user }) => {
    const photoId = String(req.query.photoId || "");
    
    if (!photoId) {
      return res.status(400).json({ error: "Photo ID required" });
    }

    if (req.method === "GET") {
      return handleGetComments(req, res, photoId, user);
    }
    return handleCreateComment(req, res, photoId, user);
  }
);

async function handleGetComments(req: NextApiRequest, res: NextApiResponse, photoId: string, viewer: SessionUser | null) {
  try {
    // Get the media item to check if it exists and is public
    const media = await db.media.findUnique({
      where: { id: photoId },
      include: { user: true }
    });

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    if (media.visibility !== "public") {
      return res.status(403).json({ error: "Media is not public" });
    }

    // Get comments with author info, ordered by creation date
    const comments = await db.photoComment.findMany({
      where: {
        mediaId: photoId,
        status: "visible",
        parentId: null // Only top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            primaryHandle: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        replies: {
          where: { status: "visible" },
          include: {
            author: {
              select: {
                id: true,
                primaryHandle: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Hide comments (and replies under them) from people the viewer blocked
    const { blockedUserIds } = await getHiddenIds(viewer?.id);
    const visible = filterBlockedComments(comments, blockedUserIds);

    return res.status(200).json({
      comments: visible,
      count: visible.length
    });

  } catch (error) {
    console.error("Error fetching photo comments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function handleCreateComment(req: NextApiRequest, res: NextApiResponse, photoId: string, me: SessionUser | null) {
  if (!me) {
    return sendUnauthenticated(res);
  }

  const { content, parentId, cap } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  if (content.trim().length > 1000) {
    return res.status(400).json({ error: "Comment too long (max 1000 characters)" });
  }

  if (!cap) {
    return res.status(401).json({ error: "Capability required" });
  }

  try {
    // Verify capability
    const resource = `media:${photoId}/comments`;
    const ok = await requireAction("write:comment", (resStr) => resStr === resource)(cap).catch(() => null);
    if (!ok) {
      return res.status(403).json({ error: "Invalid capability" });
    }

    // Get the media item to check if it exists and get owner info
    const media = await db.media.findUnique({
      where: { id: photoId },
      include: { user: true }
    });

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    if (media.visibility !== "public") {
      return res.status(403).json({ error: "Cannot comment on non-public media" });
    }

    // If this is a reply, check that parent comment exists
    let parentComment = null;
    if (parentId) {
      parentComment = await db.photoComment.findUnique({
        where: { id: parentId },
        include: { author: true }
      });
      
      if (!parentComment || parentComment.mediaId !== photoId) {
        return res.status(400).json({ error: "Invalid parent comment" });
      }
    }

    // Create the comment
    const comment = await db.photoComment.create({
      data: {
        content: content.trim(),
        mediaId: photoId,
        authorId: me.id,
        parentId: parentId || undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            primaryHandle: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // Create notifications
    if (parentComment && parentComment.authorId !== me.id) {
      // Reply notification - notify the original commenter
      await createNotification(
        parentComment.authorId,
        me.id,
        "photo_reply",
        {
          mediaId: photoId,
          commentId: comment.id,
          parentCommentId: parentId,
          mediaTitle: media.title || media.caption || "Untitled photo",
          mediaOwnerHandle: media.user.primaryHandle || undefined // Add owner handle for proper link generation
        }
      );
    } else if (!parentComment && media.userId !== me.id) {
      // Top-level comment notification - notify the media owner
      await createNotification(
        media.userId,
        me.id,
        "photo_comment",
        {
          mediaId: photoId,
          commentId: comment.id,
          mediaTitle: media.title || media.caption || "Untitled photo",
          mediaOwnerHandle: media.user.primaryHandle || undefined // Add owner handle for proper link generation
        }
      );
    }

    return res.status(201).json({
      comment,
      message: "Comment added successfully"
    });

  } catch (error) {
    console.error("Error creating photo comment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
