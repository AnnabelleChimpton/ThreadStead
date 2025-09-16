import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import crypto from "crypto";

// View type weights for trending calculation
const VIEW_TYPE_WEIGHTS = {
  full_page: 1.0,      // Opened full post
  comment_expand: 0.8, // Engaged with comments
  read_more: 0.7,      // Clicked to read more
  ring_view: 0.5,      // Viewed in ThreadRing
  profile_view: 0.4,   // Viewed on profile
  feed_view: 0.3,      // Saw in feed
  widget_click: 0.2,   // Clicked from widget
};

export type ViewType = keyof typeof VIEW_TYPE_WEIGHTS;

// Hash IP address for privacy
function hashIP(ip: string | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

// Get client IP from request
function getClientIP(req: NextApiRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const postId = String(req.query.postId);
    const viewType = (req.body.viewType || "feed_view") as ViewType;

    // Validate view type
    if (!VIEW_TYPE_WEIGHTS[viewType]) {
      return res.status(400).json({ error: "Invalid view type" });
    }

    // Get user (if logged in)
    const user = await getSessionUser(req);
    const userId = user?.id || null;

    // Get IP hash for anonymous users
    const clientIP = getClientIP(req);
    const ipHash = userId ? null : hashIP(clientIP);

    // Check for recent view (within 1 hour) to prevent spam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentView = await db.postView.findFirst({
      where: {
        postId,
        createdAt: { gte: oneHourAgo },
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(ipHash ? [{ ipHash }] : []),
        ],
      },
    });

    if (recentView) {
      return res.json({
        counted: false,
        reason: "recent_view",
        message: "View already recorded within the last hour"
      });
    }

    // Check if post exists
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Don't count author's own views
    if (userId && post.authorId === userId) {
      return res.json({
        counted: false,
        reason: "own_post",
        message: "Author's own views are not counted"
      });
    }

    // Record the view and update metrics in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create view record
      const view = await tx.postView.create({
        data: {
          postId,
          userId,
          ipHash,
          viewType,
        },
      });

      // Get or create metrics
      const metrics = await tx.postMetrics.upsert({
        where: { postId },
        update: {
          viewCount: { increment: 1 },
          uniqueViewCount: userId || ipHash ? { increment: 1 } : { increment: 0 },
          recentViews: { increment: 1 },
          lastViewedAt: new Date(),
        },
        create: {
          postId,
          viewCount: 1,
          uniqueViewCount: 1,
          recentViews: 1,
          lastViewedAt: new Date(),
          // Initialize comment count from actual comments
          commentCount: await tx.comment.count({
            where: { postId, status: "visible" },
          }),
        },
      });

      return { view, metrics };
    });

    return res.json({
      counted: true,
      viewType,
      totalViews: result.metrics.viewCount,
      message: "View recorded successfully"
    });

  } catch (error) {
    console.error("Error tracking view:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to track view"
    });
  }
}