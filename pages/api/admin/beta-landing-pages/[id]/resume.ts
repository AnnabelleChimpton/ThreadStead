import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      return res.status(400).json({ error: "Cannot resume an ended campaign" });
    }

    if (landingPage.limitReached) {
      return res.status(400).json({ error: "Cannot resume a campaign that has reached its limit. Increase the limit first." });
    }

    const updatedLandingPage = await db.betaLandingPage.update({
      where: { id },
      data: { isPaused: false },
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
      message: "Campaign resumed successfully"
    });
  } catch (error) {
    console.error("Error resuming beta landing page:", error);
    return res.status(500).json({ error: "Failed to resume campaign" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));