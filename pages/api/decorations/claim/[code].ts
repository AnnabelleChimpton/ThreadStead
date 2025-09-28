import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: "Invalid claim code" });
    }

    // Find decoration with this claim code
    const decoration = await db.decorationItem.findUnique({
      where: { claimCode: code.toUpperCase() },
      include: {
        userClaims: {
          where: { userId: user.id }
        },
        _count: {
          select: { userClaims: true }
        }
      }
    });

    if (!decoration) {
      return res.status(404).json({
        error: "Invalid claim code",
        code: "INVALID_CODE"
      });
    }

    if (!decoration.isActive) {
      return res.status(400).json({
        error: "This decoration is no longer available",
        code: "DECORATION_INACTIVE"
      });
    }

    // Check if user already claimed this decoration
    if (decoration.userClaims.length > 0) {
      return res.status(200).json({
        message: "You have already claimed this decoration",
        decoration: {
          itemId: decoration.itemId,
          name: decoration.name,
          description: decoration.description
        },
        alreadyClaimed: true
      });
    }

    // Check if decoration has claim limits
    if (decoration.maxClaims && decoration._count.userClaims >= decoration.maxClaims) {
      return res.status(400).json({
        error: "This decoration has reached its claim limit",
        code: "CLAIM_LIMIT_REACHED"
      });
    }

    // Check time-based restrictions
    const now = new Date();
    if (decoration.releaseType === 'LIMITED_TIME') {
      if (decoration.releaseStartAt && now < decoration.releaseStartAt) {
        return res.status(400).json({
          error: "This decoration is not yet available for claiming",
          code: "NOT_STARTED",
          availableAt: decoration.releaseStartAt
        });
      }

      if (decoration.releaseEndAt && now > decoration.releaseEndAt) {
        return res.status(400).json({
          error: "The claim period for this decoration has ended",
          code: "EXPIRED",
          expiredAt: decoration.releaseEndAt
        });
      }
    }

    // Create the claim
    await db.$transaction(async (tx) => {
      // Create user claim
      await tx.userDecorationClaim.create({
        data: {
          userId: user.id,
          decorationId: decoration.id,
          claimMethod: 'CODE'
        }
      });

      // Increment claim count
      await tx.decorationItem.update({
        where: { id: decoration.id },
        data: {
          claimCount: {
            increment: 1
          }
        }
      });
    });

    return res.status(200).json({
      message: "Decoration claimed successfully!",
      decoration: {
        itemId: decoration.itemId,
        name: decoration.name,
        type: decoration.type,
        category: decoration.category,
        description: decoration.description,
        iconSvg: decoration.iconSvg,
        renderSvg: decoration.renderSvg,
        imagePath: decoration.imagePath
      },
      claimedAt: new Date()
    });
  } catch (error) {
    console.error('Decoration claim API error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}