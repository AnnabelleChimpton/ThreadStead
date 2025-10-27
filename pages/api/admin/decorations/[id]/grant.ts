import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

interface GrantAccessRequest {
  userIds: string[];
  claimMethod?: 'ADMIN_GRANT' | 'BETA_ACCESS';
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: "Invalid decoration ID" });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Check if decoration exists
    const decoration = await db.decorationItem.findUnique({
      where: { id }
    });

    if (!decoration) {
      return res.status(404).json({ error: "Decoration not found" });
    }

    const {
      userIds,
      claimMethod = 'ADMIN_GRANT'
    }: GrantAccessRequest = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: "userIds must be a non-empty array"
      });
    }

    // Validate users exist
    const validUsers = await db.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: { id: true, primaryHandle: true }
    });

    if (validUsers.length !== userIds.length) {
      const foundIds = validUsers.map(u => u.id);
      const missingIds = userIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        error: `Users not found: ${missingIds.join(', ')}`
      });
    }

    // Check which users already have access
    const existingClaims = await db.userDecorationClaim.findMany({
      where: {
        decorationId: id,
        userId: { in: userIds }
      },
      select: { userId: true }
    });

    const existingUserIds = existingClaims.map(claim => claim.userId);
    const newUserIds = userIds.filter(userId => !existingUserIds.includes(userId));

    if (newUserIds.length === 0) {
      return res.status(200).json({
        message: "All specified users already have access to this decoration",
        grantedCount: 0,
        skippedCount: existingUserIds.length
      });
    }

    // Grant access to new users
    const newClaims = await db.userDecorationClaim.createMany({
      data: newUserIds.map(userId => ({
        userId,
        decorationId: id,
        claimMethod
      }))
    });

    // Update claim count on decoration
    await db.decorationItem.update({
      where: { id },
      data: {
        claimCount: {
          increment: newClaims.count
        }
      }
    });

    // Get updated decoration info
    const updatedDecoration = await db.decorationItem.findUnique({
      where: { id },
      include: {
        _count: { select: { userClaims: true } }
      }
    });

    return res.status(200).json({
      message: `Access granted to ${newClaims.count} users`,
      grantedCount: newClaims.count,
      skippedCount: existingUserIds.length,
      decoration: updatedDecoration
    });
  } catch (error) {
    console.error('Admin decoration grant API error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));