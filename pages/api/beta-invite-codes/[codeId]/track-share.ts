import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  return ip.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { codeId } = req.query;
  const { shareMethod, platform, referrer } = req.body;

  if (typeof codeId !== "string") {
    return res.status(400).json({ error: "Invalid code ID" });
  }

  if (!shareMethod) {
    return res.status(400).json({ error: "Share method is required" });
  }

  try {
    // Verify the beta invite code exists and belongs to the user
    const betaCode = await db.betaInviteCode.findFirst({
      where: {
        id: codeId,
        generatedBy: user.id
      }
    });

    if (!betaCode) {
      return res.status(404).json({ error: "Beta invite code not found or you don't have permission to track shares for this code" });
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';

    // Create the share tracking record
    const share = await db.betaInviteShare.create({
      data: {
        codeId: betaCode.id,
        sharedBy: user.id,
        shareMethod,
        platform: platform || null,
        referrer: referrer || null,
        ipAddress,
        userAgent
      }
    });

    return res.json({
      shareId: share.id,
      message: "Share tracked successfully"
    });
  } catch (error) {
    console.error("Error tracking beta invite share:", error);
    return res.status(500).json({ error: "Failed to track share" });
  }
}