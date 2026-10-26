import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { parsePagePagination } from "@/lib/server/http/pagination";
import { normalizeIp } from "@/lib/server/http/client-ip";
import { z } from "zod";

/** What IpManagementSection's bulk form sends: one address a line */
const bulkBlockSchema = z.object({
  ipAddresses: z.array(z.string().max(100)).min(1).max(500),
  reason: z.string().trim().max(500).optional(),
});

export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
    if (req.method === "GET") {
      try {
        const { blocked = "false" } = req.query;
        const { page: pageNum, limit: limitNum } = parsePagePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
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
      const { ipAddresses, reason: givenReason } = bulkBlockSchema.parse(req.body ?? {});
      const reason = givenReason || "Manual block";

      // Stored the way signups record it (getClientIp): a stray space or a
      // typo was stored as typed and never matched anyone
      const bad = ipAddresses.find((ip) => !normalizeIp(ip));
      if (bad !== undefined) {
        return res.status(400).json({ error: `"${bad.slice(0, 60)}" isn't an IP address. Nothing was blocked.` });
      }
      const validIPs = [...new Set(ipAddresses.map((ip) => normalizeIp(ip) as string))];

      try {
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
          message: `Blocked ${blockedIPs.length} IP ${blockedIPs.length === 1 ? 'address' : 'addresses'}.`
        });
      } catch (error) {
        console.error("Error blocking IP addresses:", error);
        return res.status(500).json({ error: "Failed to block IP addresses" });
      }
    }
  }
);
