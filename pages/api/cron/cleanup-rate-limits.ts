import type { NextApiRequest, NextApiResponse } from "next";
import { cleanupExpiredRateLimits } from "@/lib/middleware/generalRateLimiting";

/**
 * Cron job to clean up expired rate limit entries
 *
 * This should be called periodically (e.g., daily) via:
 * - Vercel Cron (vercel.json)
 * - External scheduler (e.g., GitHub Actions, cloud scheduler)
 *
 * Protect this endpoint with a secret token in production.
 *
 * Usage:
 * POST /api/cron/cleanup-rate-limits
 * Authorization: Bearer <CRON_SECRET>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Verify authorization token in production
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

  if (expectedToken) {
    const providedToken = authHeader?.replace("Bearer ", "");
    if (providedToken !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, require a secret
    console.error("CRON_SECRET not configured - cleanup job aborted");
    return res.status(500).json({
      error: "Server misconfiguration",
      message: "CRON_SECRET environment variable must be set in production"
    });
  }

  try {
    const deletedCount = await cleanupExpiredRateLimits();

    return res.status(200).json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} expired rate limit entries`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Rate limit cleanup error:", error);
    return res.status(500).json({
      error: "Cleanup failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
