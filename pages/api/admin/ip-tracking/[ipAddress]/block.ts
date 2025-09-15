import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { ipAddress } = req.query;
  const { reason = "Manual block" } = req.body;

  if (typeof ipAddress !== "string") {
    return res.status(400).json({ error: "Invalid IP address" });
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