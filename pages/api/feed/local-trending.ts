import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getUserBlockedIds, addBlockFiltersToWhere } from "@/lib/domain/users/blocks";

/**
 * Calculate trending score using the algorithm:
 * trending_score = (E × log(V + 1) × R × F) / T^G
 *
 * Where:
 * - E = Engagement score (views + comments×5)
 * - V = View velocity (recent_views / max(total_views, 1))
 * - R = Ratio boost (1 + (comments / max(views, 1) × 10))
 * - F = Freshness (max(0.5, 2 - (age_hours / 24)))
 * - T = Time decay ((hours_old + 2))
 * - G = Gravity (1.8)
 */
function calculateTrendingScore(metrics: {
  viewCount: number;
  commentCount: number;
  recentViews: number;
  createdAt: Date;
}): number {
  const now = new Date();
  const ageInHours = (now.getTime() - metrics.createdAt.getTime()) / (1000 * 60 * 60);

  // E: Engagement score
  const engagementScore = metrics.viewCount + (metrics.commentCount * 5);

  // V: View velocity
  const viewVelocity = metrics.recentViews / Math.max(metrics.viewCount, 1);

  // R: Ratio boost (high comment-to-view ratio is good)
  const ratioBoost = 1 + (metrics.commentCount / Math.max(metrics.viewCount, 1) * 10);

  // F: Freshness (decays over 24 hours)
  const freshness = Math.max(0.5, 2 - (ageInHours / 24));

  // T: Time decay
  const timeDecay = Math.pow(ageInHours + 2, 1.8);

  // Log factor for view count (prevents massive posts from dominating)
  const logFactor = Math.log(metrics.viewCount + 1);

  const score = (engagementScore * logFactor * viewVelocity * ratioBoost * freshness) / timeDecay;

  return Math.max(0, score); // Ensure non-negative
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const timeWindow = String(req.query.timeWindow || "week");
    const minViews = parseInt(String(req.query.minViews || "5"));

    // Calculate time window for recent posts
    let timeWindowHours: number;
    switch (timeWindow) {
      case "hour": timeWindowHours = 1; break;
      case "day": timeWindowHours = 24; break;
      case "week": timeWindowHours = 168; break;
      default: timeWindowHours = 168; // Default to week
    }

    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    // Get viewer for permission filtering
    const viewer = await getSessionUser(req);

    // Build permission filters
    const allowedVisibilities = ["public"];
    let blockedUserIds: string[] = [];
    let blockedThreadRingIds: string[] = [];

    if (viewer) {
      // Get blocked users/ThreadRings for the viewer
      const blockData = await getUserBlockedIds(viewer.id);
      blockedUserIds = blockData.blockedUserIds;
      blockedThreadRingIds = blockData.blockedThreadRingIds;
    }

    // Build base where clause
    let whereClause: any = {
      visibility: { in: allowedVisibilities },
      createdAt: { gte: timeWindowStart },
    };

    // Apply block filters if viewer is logged in
    if (viewer) {
      whereClause = addBlockFiltersToWhere(whereClause, blockedUserIds, blockedThreadRingIds);
    }

    // Get posts with metrics and calculate trending scores
    const posts = await db.post.findMany({
      where: whereClause,
      include: {
        author: {
          include: {
            handles: {
              where: { host: SITE_NAME },
              take: 1,
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        metrics: true,
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
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3, // Get more posts to filter and rank
    });

    // Calculate trending scores and filter by minimum views
    const postsWithScores = posts
      .map(post => {
        // Use metrics if available, otherwise use default values
        const metrics = post.metrics || {
          viewCount: 0,
          commentCount: 0, // Will be populated by the metrics if they exist
          recentViews: 0,
        };

        const score = calculateTrendingScore({
          viewCount: metrics.viewCount,
          commentCount: metrics.commentCount,
          recentViews: metrics.recentViews,
          createdAt: post.createdAt,
        });

        return {
          ...post,
          trendingScore: score,
          metrics,
        };
      })
      .filter(post => post.metrics.viewCount >= minViews) // Filter by minimum views
      .sort((a, b) => b.trendingScore - a.trendingScore) // Sort by trending score
      .slice(0, limit); // Take only the requested amount

    // Transform to match widget format
    const transformedPosts = postsWithScores.map(post => ({
      id: post.id,
      authorId: post.authorId,
      authorUsername: post.author.handles[0]?.handle || null,
      authorDisplayName: post.author.profile?.displayName || null,
      authorAvatarUrl: post.author.profile?.avatarUrl || null,
      title: post.title,
      intent: post.intent,
      createdAt: post.createdAt.toISOString(),
      bodyText: post.bodyText,
      commentCount: post.metrics.commentCount,
      viewCount: post.metrics.viewCount,
      trendingScore: post.trendingScore,
      threadRings: post.threadRings,
      isSpoiler: post.isSpoiler,
      contentWarning: post.contentWarning,
    }));

    return res.json({
      posts: transformedPosts,
      hasMore: posts.length === limit * 3, // Might have more if we hit the fetch limit
      source: "local_trending",
      algorithm: {
        timeWindow,
        minViews,
        totalCandidates: posts.length,
        returned: transformedPosts.length,
      }
    });

  } catch (error) {
    console.error("Error calculating local trending:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to calculate trending posts"
    });
  }
}