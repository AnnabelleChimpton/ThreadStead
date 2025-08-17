import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";
import { createNotification } from "@/lib/notifications";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const photoId = String(req.query.photoId || "");
  
  if (!photoId) {
    return res.status(400).json({ error: "Photo ID required" });
  }

  if (req.method === "GET") {
    return handleGetComments(req, res, photoId);
  } else if (req.method === "POST") {
    return handleCreateComment(req, res, photoId);
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}

async function handleGetComments(req: NextApiRequest, res: NextApiResponse, photoId: string) {
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

    return res.status(200).json({
      comments,
      count: comments.length
    });

  } catch (error) {
    console.error("Error fetching photo comments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function handleCreateComment(req: NextApiRequest, res: NextApiResponse, photoId: string) {
  const me = await getSessionUser(req);
  if (!me) {
    return res.status(401).json({ error: "Not logged in" });
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
      await createNotification({
        recipientId: parentComment.authorId,
        actorId: me.id,
        type: "photo_reply",
        data: {
          mediaId: photoId,
          commentId: comment.id,
          parentCommentId: parentId,
          mediaTitle: media.title || media.caption || "Untitled photo",
          mediaOwnerHandle: media.user.primaryHandle // Add owner handle for proper link generation
        }
      });
    } else if (!parentComment && media.userId !== me.id) {
      // Top-level comment notification - notify the media owner
      await createNotification({
        recipientId: media.userId,
        actorId: me.id,
        type: "photo_comment",
        data: {
          mediaId: photoId,
          commentId: comment.id,
          mediaTitle: media.title || media.caption || "Untitled photo",
          mediaOwnerHandle: media.user.primaryHandle // Add owner handle for proper link generation
        }
      });
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