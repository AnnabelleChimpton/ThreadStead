import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.query;
  const { signupLimit } = req.body;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid landing page ID" });
  }

  if (!signupLimit || signupLimit < 1) {
    return res.status(400).json({ error: "Signup limit must be at least 1" });
  }

  try {
    // Check if landing page exists
    const landingPage = await db.betaLandingPage.findUnique({
      where: { id }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    // Get current signup count
    const currentSignupCount = await db.betaLandingSignup.count({
      where: {
        landingPageId: id,
        status: 'completed'
      }
    });

    // Calculate if limit is reached with new limit
    const limitReached = currentSignupCount >= signupLimit;

    const updatedLandingPage = await db.betaLandingPage.update({
      where: { id },
      data: {
        signupLimit: signupLimit,
        signupCount: currentSignupCount,
        limitReached: limitReached
      },
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
      message: `Signup limit updated to ${signupLimit}`,
      currentSignups: currentSignupCount
    });
  } catch (error) {
    console.error("Error updating signup limit:", error);
    return res.status(500).json({ error: "Failed to update signup limit" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));