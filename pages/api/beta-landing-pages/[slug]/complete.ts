import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  return ip.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.query;
  const { signupId, userId, betaCode } = req.body;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid landing page slug" });
  }

  if (!signupId || !userId) {
    return res.status(400).json({ error: "Signup ID and user ID are required" });
  }

  try {
    const landingPage = await db.betaLandingPage.findUnique({
      where: { slug },
      select: {
        id: true,
        signupLimit: true,
        signupCount: true
      }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    const ipAddress = getClientIP(req);

    // Update the signup record
    const updatedSignup = await db.betaLandingSignup.update({
      where: { id: signupId },
      data: {
        userId,
        betaCode,
        signupCompletedAt: new Date(),
        status: 'completed'
      }
    });

    // Update signup attempt record
    await db.signupAttempt.updateMany({
      where: {
        ipAddress,
        landingPageId: landingPage.id,
        success: false,
        attemptedAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      data: {
        success: true,
        userId
      }
    });

    // Update IP tracking
    await db.ipSignupTracking.update({
      where: { ipAddress },
      data: {
        successfulSignups: { increment: 1 },
        lastAttemptAt: new Date()
      }
    });

    // Get updated signup count
    const completedSignupsCount = await db.betaLandingSignup.count({
      where: {
        landingPageId: landingPage.id,
        status: 'completed'
      }
    });

    // Check if limit is reached and update landing page
    const limitReached = completedSignupsCount >= landingPage.signupLimit;

    await db.betaLandingPage.update({
      where: { id: landingPage.id },
      data: {
        signupCount: completedSignupsCount,
        limitReached
      }
    });

    return res.json({
      signup: updatedSignup,
      totalSignups: completedSignupsCount,
      limitReached,
      message: "Signup completed successfully"
    });
  } catch (error) {
    console.error("Error completing beta landing page signup:", error);
    return res.status(500).json({ error: "Failed to complete signup tracking" });
  }
}