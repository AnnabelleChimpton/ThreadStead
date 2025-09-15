import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import crypto from "crypto";

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  return ip.trim();
}

function generateBetaKey(): string {
  // Generate a readable beta key: BETA-XXXX-XXXX-XXXX
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const part = crypto.randomBytes(2).toString('hex').toUpperCase();
    parts.push(part);
  }
  return `BETA-${parts.join('-')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
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
        isActive: true,
        isPaused: true,
        limitReached: true,
        endedAt: true
      }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    // Check if landing page is available
    if (landingPage.endedAt || !landingPage.isActive || landingPage.isPaused || landingPage.limitReached) {
      return res.status(400).json({ error: "Landing page is not available for signups" });
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';

    // Generate a unique beta key for this signup
    let betaKey: string;
    let attempts = 0;
    do {
      betaKey = generateBetaKey();
      const existingKey = await db.betaKey.findUnique({ where: { key: betaKey } });
      attempts++;
      if (!existingKey) break;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: "Failed to generate unique beta key" });
    }

    // Create the beta key in the database
    await db.betaKey.create({
      data: { key: betaKey }
    });

    // Create signup tracking record
    const signup = await db.betaLandingSignup.create({
      data: {
        landingPageId: landingPage.id,
        ipAddress,
        userAgent,
        status: 'started',
        betaCode: betaKey
      }
    });

    // Also create a signup attempt record
    await db.signupAttempt.create({
      data: {
        ipAddress,
        userAgent,
        landingPageId: landingPage.id,
        betaCode: betaKey,
        attemptedAt: new Date(),
        success: false // Will be updated when signup completes
      }
    });

    // Update or create IP tracking
    await db.ipSignupTracking.upsert({
      where: { ipAddress },
      update: {
        signupAttempts: { increment: 1 },
        lastAttemptAt: new Date()
      },
      create: {
        ipAddress,
        signupAttempts: 1,
        successfulSignups: 0,
        firstAttemptAt: new Date(),
        lastAttemptAt: new Date()
      }
    });

    return res.json({
      signupId: signup.id,
      betaKey: betaKey,
      message: "Signup tracking started"
    });
  } catch (error) {
    console.error("Error tracking beta landing page signup:", error);
    return res.status(500).json({ error: "Failed to track signup" });
  }
}