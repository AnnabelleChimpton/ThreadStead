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

  if (typeof ipAddress !== "string") {
    return res.status(400).json({ error: "Invalid IP address" });
  }

  try {
    // Check if IP exists in tracking
    const existingTracking = await db.ipSignupTracking.findUnique({
      where: { ipAddress }
    });

    if (!existingTracking) {
      return res.status(404).json({ error: "IP address not found in tracking" });
    }

    if (!existingTracking.isBlocked) {
      return res.status(400).json({ error: "IP address is not currently blocked" });
    }

    const unblockedIP = await db.ipSignupTracking.update({
      where: { ipAddress },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockedReason: null,
        autoBlocked: false,
        unblockAt: null
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
      ipTracking: unblockedIP,
      message: `IP address ${ipAddress} has been unblocked`
    });
  } catch (error) {
    console.error("Error unblocking IP address:", error);
    return res.status(500).json({ error: "Failed to unblock IP address" });
  }
}