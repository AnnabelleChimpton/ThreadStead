import { db } from "@/lib/config/database/connection";
import { ZodError } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { grantDecorationSchema } from "@/lib/domain/decorations/admin-requests";

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: "Invalid decoration ID" });
      }

      // Check if decoration exists
      const decoration = await db.decorationItem.findUnique({
        where: { id }
      });

      if (!decoration) {
        return res.status(404).json({ error: "Decoration not found" });
      }

      const body = grantDecorationSchema.parse(req.body);
      const userIds = [...new Set(body.userIds)];
      const claimMethod = body.claimMethod ?? 'ADMIN_GRANT';

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
      // A body that doesn't fit is apiHandler's to answer (a 400 that says what to fix)
      if (error instanceof ZodError) throw error;
      console.error('Admin decoration grant API error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);