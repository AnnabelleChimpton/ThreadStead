import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

/**
 * Migration endpoint - BETA_ITEMS have been migrated to the database.
 * This endpoint now just reports the current state.
 *
 * Decorations are managed via /admin/decorations
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Report current state
    const decorationCount = await db.decorationItem.count();

    return res.status(200).json({
      message: `Migration already complete. Database contains ${decorationCount} decorations. Manage decorations via /admin/decorations.`,
      results: {
        created: 0,
        skipped: decorationCount,
        alreadyMigrated: true
      }
    });
  } catch (error) {
    console.error('Decoration migration error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
