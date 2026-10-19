import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { availableDecorationsWhere } from "@/lib/pixel-homes/decoration-availability";
import { catalogArtFields } from "@/lib/pixel-homes/catalog-art";

export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res, { user }) => {
    try {
      const now = new Date();

      // Get all decorations that the user has access to
      const availableDecorations = await db.decorationItem.findMany({
        where: availableDecorationsWhere(user, now),
        select: {
          id: true,
          itemId: true,
          name: true,
          type: true,
          category: true,
          zone: true,
          section: true,
          iconSvg: true,
          renderSvg: true,
          imagePath: true,
          pngUrl: true,
          width: true,
          height: true,
          frames: true,
          gridWidth: true,
          gridHeight: true,
          description: true,
          releaseType: true,
          releaseStartAt: true,
          releaseEndAt: true,
          collection: true,
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
          ...(decoration.section && { section: decoration.section }), // Use section from database
          gridWidth: decoration.gridWidth,
          gridHeight: decoration.gridHeight,
          description: decoration.description,
          iconSvg: decoration.iconSvg,
          renderSvg: decoration.renderSvg,
          imagePath: decoration.imagePath,
          pngUrl: decoration.pngUrl,
          ...catalogArtFields(decoration),
          isUserClaimed: userClaims.length > 0,
          claimedAt: userClaims[0]?.claimedAt || null,
          claimMethod: userClaims[0]?.claimMethod || null,
          releaseType: decoration.releaseType,
          isDefault: decoration.releaseType === 'DEFAULT',
          isLimitedTime: decoration.releaseType === 'LIMITED_TIME',
          expiresAt: decoration.releaseEndAt,
          // A named set ("Autumn 2026"); the palette shows it as its own group
          collection: decoration.collection?.trim() || null
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
);
