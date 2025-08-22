import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { getRingHubClient } from "@/lib/ringhub-client";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const viewer = await getSessionUser(req);

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      const client = getRingHubClient();
      if (!client) {
        return res.status(500).json({ error: "Ring Hub client not configured" });
      }

      const ringDescriptor = await client.getRing(slug as string);
      
      if (!ringDescriptor) {
        return res.status(404).json({ error: "ThreadRing not found" });
      }

      // For Ring Hub rings, return simplified stats since we don't have detailed local data
      const stats = {
        memberCount: ringDescriptor.memberCount,
        postCount: ringDescriptor.postCount,
        pinnedPostCount: 0, // Not available from Ring Hub basic descriptor
        moderatorCount: 1, // Assume 1 curator
        recentActivity: {
          newMembersThisWeek: 0, // Not available from Ring Hub
          newPostsThisWeek: 0 // Not available from Ring Hub
        },
        topPosters: [], // Not available from Ring Hub
        membershipTrend: [] // Not available from Ring Hub
      };

      return res.json(stats);
    }

    // Original local database logic
    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true,
        visibility: true,
        memberCount: true,
        postCount: true,
        curatorId: true,
        createdAt: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check access permissions
    if (threadRing.visibility === "private") {
      if (!viewer) {
        return res.status(403).json({ error: "Authentication required" });
      }
      
      // Check if viewer is a member
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

    // Calculate date ranges
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Gather statistics
    const [
      pinnedPostCount,
      moderatorCount,
      newMembersThisWeek,
      newPostsThisWeek,
      topPosters,
      membershipTrend
    ] = await Promise.all([
      // Count pinned posts
      db.postThreadRing.count({
        where: {
          threadRingId: threadRing.id,
          isPinned: true
        }
      }),

      // Count moderators (including curator)
      db.threadRingMember.count({
        where: {
          threadRingId: threadRing.id,
          role: {
            in: ["curator", "moderator"]
          }
        }
      }),

      // New members this week
      db.threadRingMember.count({
        where: {
          threadRingId: threadRing.id,
          joinedAt: {
            gte: oneWeekAgo
          }
        }
      }),

      // New posts this week
      db.postThreadRing.count({
        where: {
          threadRingId: threadRing.id,
          addedAt: {
            gte: oneWeekAgo
          }
        }
      }),

      // Top posters (users with most posts in this ring)
      db.postThreadRing.groupBy({
        by: ['addedBy'],
        where: {
          threadRingId: threadRing.id
        },
        _count: {
          addedBy: true
        },
        orderBy: {
          _count: {
            addedBy: 'desc'
          }
        },
        take: 10
      }),

      // Membership trend (simplified - weekly snapshots for last month)
      db.threadRingMember.groupBy({
        by: ['joinedAt'],
        where: {
          threadRingId: threadRing.id,
          joinedAt: {
            gte: oneMonthAgo
          }
        },
        _count: {
          joinedAt: true
        },
        orderBy: {
          joinedAt: 'asc'
        }
      })
    ]);

    // Get user details for top posters
    const topPosterUserIds = topPosters.map(p => p.addedBy);
    const topPosterUsers = await db.user.findMany({
      where: {
        id: { in: topPosterUserIds }
      },
      select: {
        id: true,
        handles: {
          where: { host: SITE_NAME },
          take: 1,
          select: { handle: true }
        },
        profile: {
          select: { displayName: true }
        }
      }
    });

    // Transform top posters data
    const transformedTopPosters = topPosters.map(poster => {
      const user = topPosterUsers.find(u => u.id === poster.addedBy);
      const handle = user?.handles[0]?.handle || "unknown";
      
      return {
        username: handle,
        displayName: user?.profile?.displayName,
        postCount: poster._count.addedBy
      };
    });

    // Simple membership trend (count cumulative members by week)
    const membershipTrendData = [];
    const startDate = oneMonthAgo;
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const memberCountAtDate = await db.threadRingMember.count({
        where: {
          threadRingId: threadRing.id,
          joinedAt: {
            lte: currentDate
          }
        }
      });
      
      membershipTrendData.push({
        date: currentDate.toISOString().split('T')[0],
        count: memberCountAtDate
      });
      
      currentDate.setDate(currentDate.getDate() + 7); // Weekly intervals
    }

    const stats = {
      memberCount: threadRing.memberCount,
      postCount: threadRing.postCount,
      pinnedPostCount,
      moderatorCount,
      recentActivity: {
        newMembersThisWeek,
        newPostsThisWeek
      },
      topPosters: transformedTopPosters,
      membershipTrend: membershipTrendData
    };

    return res.json(stats);

  } catch (error) {
    console.error("Error fetching ThreadRing stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});