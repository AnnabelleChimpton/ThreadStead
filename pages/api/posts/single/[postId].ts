import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const postId = String(req.query.postId || "");
  if (!postId) {
    return res.status(400).json({ error: "Post ID is required" });
  }

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
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

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const viewer = await getSessionUser(req);
    const authorId = post.authorId;

    // Check visibility permissions
    let canView = false;

    if (post.visibility === "public") {
      canView = true;
    } else if (viewer?.id === authorId) {
      // Author can always see their own posts
      canView = true;
    } else if (viewer && post.visibility === "followers") {
      // Check if viewer follows author
      const followRelation = await db.follow.findUnique({
        where: { 
          followerId_followeeId: { 
            followerId: viewer.id, 
            followeeId: authorId 
          } 
        },
      });
      canView = followRelation?.status === "accepted";
    } else if (viewer && post.visibility === "friends") {
      // Check if they are mutual friends
      const [viewerFollowsAuthor, authorFollowsViewer] = await Promise.all([
        db.follow.findUnique({
          where: { 
            followerId_followeeId: { 
              followerId: viewer.id, 
              followeeId: authorId 
            } 
          },
        }),
        db.follow.findUnique({
          where: { 
            followerId_followeeId: { 
              followerId: authorId, 
              followeeId: viewer.id 
            } 
          },
        }),
      ]);

      const isFollower = viewerFollowsAuthor?.status === "accepted";
      const isFriend = isFollower && authorFollowsViewer?.status === "accepted";
      canView = isFriend;
    }

    if (!canView) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}