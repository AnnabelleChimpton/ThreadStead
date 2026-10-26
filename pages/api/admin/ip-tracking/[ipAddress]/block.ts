import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { normalizeIp } from "@/lib/server/http/client-ip";
import { z } from "zod";

const blockSchema = z.object({ reason: z.string().trim().max(500).optional() });

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin", schema: blockSchema },
  async (req, res, { user: adminUser, body }) => {
    const reason = body.reason || "Manual block";
    // Stored the way signups record it (getClientIp), or the block never matches
    const ipAddress = normalizeIp(typeof req.query.ipAddress === "string" ? req.query.ipAddress : undefined);
    if (!ipAddress) {
      return res.status(400).json({ error: "That isn't an IP address." });
    }

    try {
      const blockedIP = await db.ipSignupTracking.upsert({
        where: { ipAddress },
        update: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy: adminUser.id,
          blockedReason: reason,
          autoBlocked: false,
          unblockAt: null // Remove any auto-unblock time
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
        },
        include: {
          blocker: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              primaryHandle: true
            }
          }
        }
      });

      return res.json({
        ipTracking: blockedIP,
        message: `IP address ${ipAddress} has been blocked`
      });
    } catch (error) {
      console.error("Error blocking IP address:", error);
      return res.status(500).json({ error: "Failed to block IP address" });
    }
  }
);
