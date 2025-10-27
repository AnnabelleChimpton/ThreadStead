import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

interface UpdateDecorationRequest {
  name?: string;
  type?: string;
  category?: string;
  zone?: string;
  iconSvg?: string;
  renderSvg?: string;
  imagePath?: string;
  gridWidth?: number;
  gridHeight?: number;
  description?: string;
  isActive?: boolean;
  releaseType?: 'PUBLIC' | 'LIMITED_TIME' | 'CLAIM_CODE' | 'ADMIN_ONLY' | 'BETA_USERS';
  releaseStartAt?: string | null;
  releaseEndAt?: string | null;
  maxClaims?: number | null;
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

    // Check if decoration exists
    const existingDecoration = await db.decorationItem.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, primaryHandle: true } },
        _count: { select: { userClaims: true } }
      }
    });

    if (!existingDecoration) {
      return res.status(404).json({ error: "Decoration not found" });
    }

    if (req.method === 'GET') {
      // Get decoration details
      return res.status(200).json({ decoration: existingDecoration });
    }

    if (req.method === 'PUT') {
      // Update decoration
      const {
        name,
        type,
        category,
        zone,
        iconSvg,
        renderSvg,
        imagePath,
        gridWidth,
        gridHeight,
        description,
        isActive,
        releaseType,
        releaseStartAt,
        releaseEndAt,
        maxClaims
      }: UpdateDecorationRequest = req.body;

      // Validate time-based releases if updating to LIMITED_TIME
      if (releaseType === 'LIMITED_TIME') {
        if (!releaseStartAt || !releaseEndAt) {
          return res.status(400).json({
            error: "releaseStartAt and releaseEndAt required for LIMITED_TIME releases"
          });
        }

        const startDate = new Date(releaseStartAt);
        const endDate = new Date(releaseEndAt);

        if (startDate >= endDate) {
          return res.status(400).json({
            error: "releaseStartAt must be before releaseEndAt"
          });
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (zone !== undefined) updateData.zone = zone;
      if (iconSvg !== undefined) updateData.iconSvg = iconSvg;
      if (renderSvg !== undefined) updateData.renderSvg = renderSvg;
      if (imagePath !== undefined) updateData.imagePath = imagePath;
      if (gridWidth !== undefined) updateData.gridWidth = gridWidth;
      if (gridHeight !== undefined) updateData.gridHeight = gridHeight;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (releaseType !== undefined) updateData.releaseType = releaseType;
      if (releaseStartAt !== undefined) {
        updateData.releaseStartAt = releaseStartAt ? new Date(releaseStartAt) : null;
      }
      if (releaseEndAt !== undefined) {
        updateData.releaseEndAt = releaseEndAt ? new Date(releaseEndAt) : null;
      }
      if (maxClaims !== undefined) updateData.maxClaims = maxClaims;

      const updatedDecoration = await db.decorationItem.update({
        where: { id },
        data: updateData,
        include: {
          creator: { select: { id: true, primaryHandle: true } },
          _count: { select: { userClaims: true } }
        }
      });

      return res.status(200).json({ decoration: updatedDecoration });
    }

    if (req.method === 'DELETE') {
      // Delete decoration
      // Check if any users have claimed this decoration
      const claimCount = await db.userDecorationClaim.count({
        where: { decorationId: id }
      });

      if (claimCount > 0) {
        return res.status(400).json({
          error: `Cannot delete decoration: ${claimCount} users have claimed this item. Consider deactivating instead.`
        });
      }

      await db.decorationItem.delete({
        where: { id }
      });

      return res.status(200).json({ message: "Decoration deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error('Admin decoration management API error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));