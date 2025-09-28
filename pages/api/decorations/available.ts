import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const now = new Date();

    // Get all decorations that the user has access to
    const availableDecorations = await db.decorationItem.findMany({
      where: {
        isActive: true,
        OR: [
          // Default decorations - always available to everyone
          { releaseType: 'DEFAULT' },

          // Public decorations
          { releaseType: 'PUBLIC' },

          // Limited time decorations that are currently active
          {
            releaseType: 'LIMITED_TIME',
            releaseStartAt: { lte: now },
            releaseEndAt: { gte: now }
          },

          // Beta users only (if user has beta access)
          ...(user.betaKey ? [{ releaseType: 'BETA_USERS' as const }] : []),

          // Decorations explicitly claimed by this user
          {
            userClaims: {
              some: {
                userId: user.id
              }
            }
          }
        ]
      },
      select: {
        id: true,
        itemId: true,
        name: true,
        type: true,
        category: true,
        zone: true,
        iconSvg: true,
        renderSvg: true,
        imagePath: true,
        gridWidth: true,
        gridHeight: true,
        description: true,
        releaseType: true,
        releaseStartAt: true,
        releaseEndAt: true,
        userClaims: {
          where: { userId: user.id },
          select: { claimedAt: true, claimMethod: true }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Transform the data to match the expected format
    const decorationsByCategory: Record<string, any[]> = {};

    availableDecorations.forEach(decoration => {
      const { userClaims, ...decorationData } = decoration;

      const transformedDecoration = {
        id: decoration.itemId, // Use itemId as the main ID for frontend compatibility
        name: decoration.name,
        type: decoration.type,
        zone: decoration.zone,
        gridWidth: decoration.gridWidth,
        gridHeight: decoration.gridHeight,
        description: decoration.description,
        iconSvg: decoration.iconSvg,
        renderSvg: decoration.renderSvg,
        imagePath: decoration.imagePath,
        isUserClaimed: userClaims.length > 0,
        claimedAt: userClaims[0]?.claimedAt || null,
        claimMethod: userClaims[0]?.claimMethod || null,
        releaseType: decoration.releaseType,
        isDefault: decoration.releaseType === 'DEFAULT',
        isLimitedTime: decoration.releaseType === 'LIMITED_TIME',
        expiresAt: decoration.releaseEndAt
      };

      if (!decorationsByCategory[decoration.category]) {
        decorationsByCategory[decoration.category] = [];
      }

      decorationsByCategory[decoration.category].push(transformedDecoration);
    });

    return res.status(200).json({
      decorations: decorationsByCategory,
      userInfo: {
        id: user.id,
        hasBetaAccess: !!user.betaKey,
        totalClaimed: availableDecorations.filter(d => d.userClaims.length > 0).length
      }
    });
  } catch (error) {
    console.error('Decorations available API error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}