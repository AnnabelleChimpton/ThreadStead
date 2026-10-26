import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { getClientIp } from "@/lib/server/http/client-ip";
import { z } from "zod";

/** What BetaInviteCodesManager sends; any size or type was stored as sent */
const shareSchema = z.object({
  shareMethod: z.string().trim().min(1).max(50),
  platform: z.string().max(50).nullable().optional(),
  referrer: z.string().max(2000).nullable().optional(),
});

export default apiHandler(
  { methods: ["POST"], auth: "user", schema: shareSchema },
  async (req, res, { user, body }) => {
    const { codeId } = req.query;
    const { shareMethod, platform, referrer } = body;

    if (typeof codeId !== "string") {
      return res.status(400).json({ error: "Invalid code ID" });
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

      const ipAddress = (getClientIp(req) ?? 'unknown');
      const userAgent = (req.headers['user-agent'] || '').slice(0, 500);

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
        message: "Noted."
      });
    } catch (error) {
      console.error("Error tracking beta invite share:", error);
      return res.status(500).json({ error: "Failed to track share" });
    }
  }
);
