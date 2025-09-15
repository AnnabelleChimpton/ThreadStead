import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid landing page slug" });
  }

  try {
    const landingPage = await db.betaLandingPage.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        title: true,
        description: true,
        content: true,
        isActive: true,
        isPaused: true,
        signupLimit: true,
        signupCount: true,
        limitReached: true,
        endedAt: true,
        createdAt: true
      }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    // Get current signup count
    const currentSignupCount = await db.betaLandingSignup.count({
      where: {
        landingPageId: landingPage.id,
        status: 'completed'
      }
    });

    // Check if limit is reached
    const limitReached = currentSignupCount >= landingPage.signupLimit;

    // Update the count if it's different
    if (currentSignupCount !== landingPage.signupCount || limitReached !== landingPage.limitReached) {
      await db.betaLandingPage.update({
        where: { id: landingPage.id },
        data: {
          signupCount: currentSignupCount,
          limitReached: limitReached
        }
      });
    }

    // Determine availability
    let available = true;
    let message = null;

    if (landingPage.endedAt) {
      available = false;
      message = "This campaign has ended and is no longer accepting signups.";
    } else if (!landingPage.isActive) {
      available = false;
      message = "This campaign is currently inactive.";
    } else if (landingPage.isPaused) {
      available = false;
      message = "This campaign is temporarily paused. Please check back later.";
    } else if (limitReached) {
      available = false;
      message = "This campaign has reached its maximum number of signups.";
    }

    const status = {
      landingPage: {
        id: landingPage.id,
        name: landingPage.name,
        slug: landingPage.slug,
        title: landingPage.title,
        description: landingPage.description,
        content: landingPage.content
      },
      available,
      message,
      signupCount: currentSignupCount,
      signupLimit: landingPage.signupLimit,
      spotsRemaining: Math.max(0, landingPage.signupLimit - currentSignupCount)
    };

    return res.json({ status });
  } catch (error) {
    console.error("Error checking beta landing page status:", error);
    return res.status(500).json({ error: "Failed to check landing page status" });
  }
}