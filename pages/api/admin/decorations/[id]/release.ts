import { getSiteBaseUrl } from '@/lib/config/site-url';
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { randomBytes } from 'crypto';
import { ZodError } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { releaseDecorationSchema, windowProblem } from "@/lib/domain/decorations/admin-requests";

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

      const { releaseType, releaseStartAt, releaseEndAt, maxClaims, generateCode = false } = releaseDecorationSchema.parse(req.body);

      // Validate time-based releases
      if (releaseType === 'LIMITED_TIME') {
        const startDate = releaseStartAt ? new Date(releaseStartAt) : null;
        const problem = windowProblem(startDate, releaseEndAt ? new Date(releaseEndAt) : null);
        if (problem) return res.status(400).json({ error: problem });
        // A minute's grace: a start "now" from a form is already a little past
        if (startDate! < new Date(Date.now() - 60_000)) {
          return res.status(400).json({ error: "The start can't be in the past." });
        }
      }

      // Generate claim code if requested
      let claimCode: string | null = null;
      if (generateCode) {
        // Generate a unique 8-character claim code
        let codeGenerated = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!codeGenerated && attempts < maxAttempts) {
          claimCode = randomBytes(4).toString('hex').toUpperCase();

          // Check if code already exists
          const existingCode = await db.decorationItem.findUnique({
            where: { claimCode }
          });

          if (!existingCode) {
            codeGenerated = true;
          }
          attempts++;
        }

        if (!codeGenerated) {
          return res.status(500).json({
            error: "Failed to generate unique claim code. Please try again."
          });
        }
      }

      // Update decoration with release settings
      const updateData: Prisma.DecorationItemUpdateInput = {
        releaseType,
        releaseStartAt: releaseStartAt ? new Date(releaseStartAt) : null,
        releaseEndAt: releaseEndAt ? new Date(releaseEndAt) : null,
        // Left out keeps the item's limit (it used to wipe it)
        ...(maxClaims !== undefined && { maxClaims }),
        // A claim-code release keeps its code unless a new one is asked for;
        // a limited-time one has none
        claimCode: releaseType === 'CLAIM_CODE' ? claimCode ?? decoration.claimCode : null,
      };

      const updatedDecoration = await db.decorationItem.update({
        where: { id },
        data: updateData,
        include: {
          creator: { select: { id: true, primaryHandle: true } },
          _count: { select: { userClaims: true } }
        }
      });

      return res.status(200).json({
        decoration: updatedDecoration,
        claimUrl: updatedDecoration.claimCode ? `${getSiteBaseUrl()}/claim/${updatedDecoration.claimCode}` : null
      });
    } catch (error) {
      // A body that doesn't fit is apiHandler's to answer (a 400 that says what to fix)
      if (error instanceof ZodError) throw error;
      console.error('Admin decoration release API error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);