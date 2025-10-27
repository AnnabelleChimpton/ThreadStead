import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";


async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      const { page = "1", limit = "50", blocked = "false" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const showBlocked = blocked === "true";

      const where = showBlocked ? { isBlocked: true } : {};

      const [ipTracking, totalCount] = await Promise.all([
        db.ipSignupTracking.findMany({
          where,
          include: {
            blocker: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
                primaryHandle: true
              }
            }
          },
          orderBy: { lastAttemptAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum
        }),
        db.ipSignupTracking.count({ where })
      ]);

      // Get recent signup attempts for each IP (last 24 hours)
      const recentAttempts = await db.signupAttempt.findMany({
        where: {
          attemptedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          ipAddress: true,
          success: true
        }
      });

      const recentAttemptsMap = recentAttempts.reduce((acc, attempt) => {
        if (!acc[attempt.ipAddress]) {
          acc[attempt.ipAddress] = { totalAttempts: 0, successfulAttempts: 0 };
        }
        acc[attempt.ipAddress].totalAttempts++;
        if (attempt.success) {
          acc[attempt.ipAddress].successfulAttempts++;
        }
        return acc;
      }, {} as Record<string, { totalAttempts: number; successfulAttempts: number }>);

      const enrichedTracking = ipTracking.map(tracking => ({
        ...tracking,
        recentAttempts: recentAttemptsMap[tracking.ipAddress] || { totalAttempts: 0, successfulAttempts: 0 },
        successRate: tracking.signupAttempts > 0 ? (tracking.successfulSignups / tracking.signupAttempts * 100) : 0
      }));

      return res.json({
        ipTracking: enrichedTracking,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
    } catch (error) {
      console.error("Error fetching IP tracking data:", error);
      return res.status(500).json({ error: "Failed to fetch IP tracking data" });
    }
  }

  if (req.method === "POST") {
    // Bulk block IPs
    try {
      const { ipAddresses, reason = "Manual block" } = req.body;

      if (!Array.isArray(ipAddresses) || ipAddresses.length === 0) {
        return res.status(400).json({ error: "IP addresses array is required" });
      }

      // Validate IP addresses
      const validIPs = ipAddresses.filter(ip => typeof ip === 'string' && ip.trim().length > 0);
      if (validIPs.length === 0) {
        return res.status(400).json({ error: "No valid IP addresses provided" });
      }

      const blockedIPs = await Promise.all(
        validIPs.map(async (ipAddress) => {
          return db.ipSignupTracking.upsert({
            where: { ipAddress },
            update: {
              isBlocked: true,
              blockedAt: new Date(),
              blockedBy: adminUser.id,
              blockedReason: reason,
              autoBlocked: false
            },
            create: {
              ipAddress,
              signupAttempts: 0,
              successfulSignups: 0,
              firstAttemptAt: new Date(),
              lastAttemptAt: new Date(),
              isBlocked: true,
              blockedAt: new Date(),
              blockedBy: adminUser.id,
              blockedReason: reason,
              autoBlocked: false
            }
          });
        })
      );

      return res.json({
        blockedIPs,
        message: `Successfully blocked ${blockedIPs.length} IP addresses`
      });
    } catch (error) {
      console.error("Error blocking IP addresses:", error);
      return res.status(500).json({ error: "Failed to block IP addresses" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
