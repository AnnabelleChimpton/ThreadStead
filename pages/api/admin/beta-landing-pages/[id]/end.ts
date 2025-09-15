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

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid landing page ID" });
  }

  try {
    // Check if landing page exists
    const landingPage = await db.betaLandingPage.findUnique({
      where: { id }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    if (landingPage.endedAt) {
      return res.status(400).json({ error: "Campaign is already ended" });
    }

    const updatedLandingPage = await db.betaLandingPage.update({
      where: { id },
      data: {
        endedAt: new Date(),
        endedBy: adminUser.id,
        isActive: false,
        isPaused: false
      },
      include: {
        creator: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
            primaryHandle: true
          }
        },
        ender: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
            primaryHandle: true
          }
        }
      }
    });

    return res.json({
      landingPage: updatedLandingPage,
      message: "Campaign ended successfully"
    });
  } catch (error) {
    console.error("Error ending beta landing page:", error);
    return res.status(500).json({ error: "Failed to end campaign" });
  }
}