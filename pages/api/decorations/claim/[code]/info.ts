import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: "Invalid claim code" });
    }

    // Find decoration with this claim code
    const decoration = await db.decorationItem.findUnique({
      where: { claimCode: code.toUpperCase() },
      select: {
        id: true,
        itemId: true,
        name: true,
        type: true,
        category: true,
        description: true,
        iconSvg: true,
        imagePath: true,
        isActive: true,
        releaseType: true,
        releaseStartAt: true,
        releaseEndAt: true,
        maxClaims: true,
        claimCount: true,
        createdAt: true
      }
    });

    if (!decoration) {
      return res.status(404).json({
        error: "Invalid claim code",
        code: "INVALID_CODE"
      });
    }

    // Check availability status
    const now = new Date();
    let status = 'available';
    let statusMessage = null;

    if (!decoration.isActive) {
      status = 'inactive';
      statusMessage = 'This decoration is no longer available';
    } else if (decoration.maxClaims && decoration.claimCount >= decoration.maxClaims) {
      status = 'limit_reached';
      statusMessage = 'This decoration has reached its claim limit';
    } else if (decoration.releaseType === 'LIMITED_TIME') {
      if (decoration.releaseStartAt && now < decoration.releaseStartAt) {
        status = 'not_started';
        statusMessage = 'This decoration is not yet available for claiming';
      } else if (decoration.releaseEndAt && now > decoration.releaseEndAt) {
        status = 'expired';
        statusMessage = 'The claim period for this decoration has ended';
      }
    }

    return res.status(200).json({
      decoration: {
        itemId: decoration.itemId,
        name: decoration.name,
        type: decoration.type,
        category: decoration.category,
        description: decoration.description,
        iconSvg: decoration.iconSvg,
        imagePath: decoration.imagePath
      },
      status,
      statusMessage,
      availability: {
        totalClaims: decoration.claimCount,
        maxClaims: decoration.maxClaims,
        remainingClaims: decoration.maxClaims ? decoration.maxClaims - decoration.claimCount : null,
        releaseStartAt: decoration.releaseStartAt,
        releaseEndAt: decoration.releaseEndAt,
        isLimitedTime: decoration.releaseType === 'LIMITED_TIME'
      }
    });
  } catch (error) {
    console.error('Decoration claim info API error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}