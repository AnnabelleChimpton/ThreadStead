import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

/**
 * Admin endpoint to view and manage rate limit statistics
 *
 * GET: View rate limit stats (top users, categories, recent activity)
 * POST: Reset rate limits for a specific user/identifier
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const viewer = await getSessionUser(req);
  if (!viewer) {
    return res.status(401).json({ error: "Not logged in" });
  }

  // Check if user is admin
  const user = await db.user.findUnique({
    where: { id: viewer.id },
    select: { role: true }
  });

  if (user?.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    return handleGetStats(req, res);
  } else if (req.method === "POST") {
    return handleResetRateLimit(req, res);
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}

async function handleGetStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get top users by request count
    const topUsers = await db.$queryRaw<Array<{
      identifier: string;
      category: string;
      requestCount: number;
      windowStart: Date;
      expiresAt: Date;
    }>>`
      SELECT identifier, category, "requestCount", "windowStart", "expiresAt"
      FROM "RateLimit"
      WHERE "expiresAt" > NOW()
      ORDER BY "requestCount" DESC
      LIMIT 20
    `;

    // Get stats by category
    const categoryStats = await db.$queryRaw<Array<{
      category: string;
      totalRequests: bigint;
      uniqueIdentifiers: bigint;
    }>>`
      SELECT
        category,
        SUM("requestCount") as "totalRequests",
        COUNT(DISTINCT identifier) as "uniqueIdentifiers"
      FROM "RateLimit"
      WHERE "expiresAt" > NOW()
      GROUP BY category
      ORDER BY "totalRequests" DESC
    `;

    // Get recent rate limit violations (users at or near limit)
    const recentViolations = await db.$queryRaw<Array<{
      identifier: string;
      category: string;
      requestCount: number;
      windowStart: Date;
    }>>`
      SELECT identifier, category, "requestCount", "windowStart"
      FROM "RateLimit"
      WHERE "expiresAt" > NOW()
        AND "requestCount" >=
          CASE
            WHEN category = 'posts' THEN 8
            WHEN category = 'comments' THEN 15
            WHEN category = 'uploads' THEN 4
            WHEN category = 'profile_updates' THEN 8
            WHEN category = 'threadring_operations' THEN 15
            WHEN category = 'guestbook' THEN 4
            WHEN category = 'admin' THEN 80
            ELSE 50
          END
      ORDER BY "requestCount" DESC
      LIMIT 20
    `;

    // Total active rate limit entries
    const totalActive = await db.rateLimit.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    });

    // Total expired entries (ready for cleanup)
    const totalExpired = await db.rateLimit.count({
      where: {
        expiresAt: {
          lte: new Date()
        }
      }
    });

    return res.json({
      stats: {
        totalActive,
        totalExpired,
        topUsers: topUsers.map(u => ({
          ...u,
          requestCount: Number(u.requestCount)
        })),
        categoryStats: categoryStats.map(c => ({
          category: c.category,
          totalRequests: Number(c.totalRequests),
          uniqueIdentifiers: Number(c.uniqueIdentifiers)
        })),
        recentViolations: recentViolations.map(v => ({
          ...v,
          requestCount: Number(v.requestCount)
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching rate limit stats:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}

async function handleResetRateLimit(req: NextApiRequest, res: NextApiResponse) {
  const { identifier, category } = req.body as { identifier?: string; category?: string };

  if (!identifier) {
    return res.status(400).json({ error: "identifier required" });
  }

  try {
    if (category) {
      // Reset specific category for identifier
      const deleted = await db.rateLimit.deleteMany({
        where: {
          identifier,
          category
        }
      });

      return res.json({
        success: true,
        message: `Reset rate limit for ${identifier} in category ${category}`,
        deletedCount: deleted.count
      });
    } else {
      // Reset all categories for identifier
      const deleted = await db.rateLimit.deleteMany({
        where: { identifier }
      });

      return res.json({
        success: true,
        message: `Reset all rate limits for ${identifier}`,
        deletedCount: deleted.count
      });
    }
  } catch (error) {
    console.error("Error resetting rate limit:", error);
    return res.status(500).json({ error: "Failed to reset rate limit" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
