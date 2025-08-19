import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));

    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { id: true, visibility: true }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    const viewer = await getSessionUser(req);

    // Check if viewer can access this ThreadRing
    if (threadRing.visibility === "private") {
      if (!viewer) {
        return res.status(403).json({ error: "Authentication required" });
      }
      
      // Check if viewer is a member of this ThreadRing
      const membership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: threadRing.id,
            userId: viewer.id
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Build visibility filter based on viewer's relationship with post authors
    let visibilityFilter: any = { visibility: "public" };

    if (viewer) {
      // Get all ThreadRing member IDs for relationship checking
      const members = await db.threadRingMember.findMany({
        where: { threadRingId: threadRing.id },
        select: { userId: true }
      });
      const memberIds = members.map(m => m.userId);

      // Get viewer's follows to these members
      const viewerFollows = await db.follow.findMany({
        where: {
          followerId: viewer.id,
          followeeId: { in: memberIds },
          status: "accepted"
        },
        select: { followeeId: true }
      });
      const followedIds = viewerFollows.map(f => f.followeeId);

      // Get mutual follows (friends) with these members
      const mutualFollows = await db.follow.findMany({
        where: {
          followerId: { in: followedIds },
          followeeId: viewer.id,
          status: "accepted"
        },
        select: { followerId: true }
      });
      const friendIds = mutualFollows.map(f => f.followerId);

      // Build complex visibility filter
      visibilityFilter = {
        OR: [
          { visibility: "public" },
          { authorId: viewer.id }, // Viewer's own posts
          {
            AND: [
              { visibility: "followers" },
              { authorId: { in: followedIds } }
            ]
          },
          {
            AND: [
              { visibility: "friends" },
              { authorId: { in: friendIds } }
            ]
          }
        ]
      };
    }

    // Fetch posts associated with this ThreadRing
    const posts = await db.post.findMany({
      where: {
        ...visibilityFilter,
        threadRings: {
          some: {
            threadRingId: threadRing.id
          }
        }
      },
      include: {
        author: {
          include: {
            handles: {
              where: { host: SITE_NAME },
              take: 1
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        threadRings: {
          include: {
            threadRing: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });

    // Transform posts to include username and comment count
    const transformedPosts = posts.map(post => ({
      id: post.id,
      authorId: post.authorId,
      authorUsername: post.author.handles[0]?.handle || null,
      authorDisplayName: post.author.profile?.displayName || null,
      authorAvatarUrl: post.author.profile?.avatarUrl || null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      title: post.title,
      bodyHtml: post.bodyHtml,
      bodyText: post.bodyText,
      bodyMarkdown: post.bodyMarkdown,
      media: post.media,
      tags: post.tags,
      visibility: post.visibility,
      commentCount: post.comments.length,
      threadRings: post.threadRings
    }));

    return res.json({ 
      posts: transformedPosts,
      hasMore: posts.length === limit 
    });

  } catch (error) {
    console.error("Error fetching ThreadRing posts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}