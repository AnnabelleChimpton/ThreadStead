import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const { 
    scope = "current" // "current", "parent", "children", "family" (parent + current + children)
  } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));

    // Find the base ThreadRing
    const baseRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true,
        visibility: true, 
        parentId: true,
        lineagePath: true,
        lineageDepth: true
      }
    });

    if (!baseRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    const viewer = await getSessionUser(req);

    // Check if viewer can access the base ThreadRing
    if (baseRing.visibility === "private") {
      if (!viewer) {
        return res.status(403).json({ error: "Authentication required" });
      }
      
      const membership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: baseRing.id,
            userId: viewer.id
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Determine which ThreadRings to include based on scope
    let targetRingIds: string[] = [];

    switch (scope) {
      case "current":
        targetRingIds = [baseRing.id];
        break;

      case "parent":
        if (baseRing.parentId) {
          // Check if viewer can access parent ring
          const parentRing = await db.threadRing.findUnique({
            where: { id: baseRing.parentId },
            select: { id: true, visibility: true }
          });

          if (parentRing && await canAccessRing(parentRing, viewer)) {
            targetRingIds = [baseRing.parentId];
          }
        }
        break;

      case "children":
        // Get direct children only
        const childRings = await db.threadRing.findMany({
          where: { parentId: baseRing.id },
          select: { id: true, visibility: true }
        });

        const accessibleChildren = [];
        for (const child of childRings) {
          if (await canAccessRing(child, viewer)) {
            accessibleChildren.push(child.id);
          }
        }
        targetRingIds = accessibleChildren;
        break;

      case "family":
        // Include parent + current + children (direct family only)
        const familyIds = new Set<string>([baseRing.id]);

        // Add direct parent
        if (baseRing.parentId) {
          const parentRing = await db.threadRing.findUnique({
            where: { id: baseRing.parentId },
            select: { id: true, visibility: true }
          });

          if (parentRing && await canAccessRing(parentRing, viewer)) {
            familyIds.add(baseRing.parentId);
          }
        }

        // Add direct children
        const directChildren = await db.threadRing.findMany({
          where: { parentId: baseRing.id },
          select: { id: true, visibility: true }
        });

        for (const child of directChildren) {
          if (await canAccessRing(child, viewer)) {
            familyIds.add(child.id);
          }
        }

        targetRingIds = Array.from(familyIds);
        break;

      default:
        return res.status(400).json({ error: "Invalid scope. Use: current, parent, children, or family" });
    }

    if (targetRingIds.length === 0) {
      return res.json({
        success: true,
        posts: [],
        scope,
        rings: [],
        pagination: {
          limit,
          offset,
          hasMore: false
        }
      });
    }

    // Get posts from target rings with proper visibility filtering
    const posts = await getPostsFromRings(targetRingIds, viewer, limit, offset);

    // Get ring info for context
    const ringInfo = await db.threadRing.findMany({
      where: { id: { in: targetRingIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        visibility: true
      }
    });

    return res.json({
      success: true,
      posts,
      scope,
      rings: ringInfo,
      baseRing: {
        id: baseRing.id,
        name: baseRing.name,
        slug
      },
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit // Simple check - there might be more
      }
    });

  } catch (error) {
    console.error("Lineage feed error:", error);
    return res.status(500).json({
      error: "Failed to fetch lineage feed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Helper function to check if viewer can access a ring
async function canAccessRing(
  ring: { id: string; visibility: string }, 
  viewer: any
): Promise<boolean> {
  if (ring.visibility === "public" || ring.visibility === "unlisted") {
    return true;
  }

  if (ring.visibility === "private") {
    if (!viewer) return false;
    
    const membership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: ring.id,
          userId: viewer.id
        }
      }
    });
    
    return !!membership;
  }

  return false;
}

// Helper function to get posts from multiple rings with visibility filtering
async function getPostsFromRings(
  ringIds: string[],
  viewer: any,
  limit: number,
  offset: number
) {
  // Build visibility filter based on viewer's relationships
  let visibilityFilter: any = { visibility: "public" };

  if (viewer) {
    // Get all members from target rings for relationship checking
    const members = await db.threadRingMember.findMany({
      where: { threadRingId: { in: ringIds } },
      select: { userId: true }
    });
    const memberIds = [...new Set(members.map(m => m.userId))]; // Deduplicate

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

    // Get mutual follows (friends)
    const mutualFollows = await db.follow.findMany({
      where: {
        followerId: { in: followedIds },
        followeeId: viewer.id,
        status: "accepted"
      },
      select: { followerId: true }
    });
    const friendIds = mutualFollows.map(f => f.followerId);

    // Complex visibility filter
    visibilityFilter = {
      OR: [
        { visibility: "public" },
        { authorId: viewer.id },
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

  // Get posts associated with target rings
  const posts = await db.post.findMany({
    where: {
      AND: [
        visibilityFilter,
        {
          threadRings: {
            some: {
              threadRingId: { in: ringIds }
            }
          }
        }
      ]
    },
    include: {
      author: {
        include: {
          handles: true,
          profile: true
        }
      },
      threadRings: {
        include: {
          threadRing: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      _count: {
        select: {
          comments: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit,
    skip: offset
  });

  return posts;
}