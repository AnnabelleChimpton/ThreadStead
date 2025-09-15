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
    // Check if landing page exists and is not ended
    const landingPage = await db.betaLandingPage.findUnique({
      where: { id }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    if (landingPage.endedAt) {
      return res.status(400).json({ error: "Cannot pause an ended campaign" });
    }

    const updatedLandingPage = await db.betaLandingPage.update({
      where: { id },
      data: { isPaused: true },
      include: {
        creator: {
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
      message: "Campaign paused successfully"
    });
  } catch (error) {
    console.error("Error pausing beta landing page:", error);
    return res.status(500).json({ error: "Failed to pause campaign" });
  }
}