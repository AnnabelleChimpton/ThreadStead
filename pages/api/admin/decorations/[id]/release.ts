import { getSiteBaseUrl } from '@/lib/config/site-url';
import { db } from "@/lib/config/database/connection";
import { randomBytes } from 'crypto';
import { apiHandler } from "@/lib/api/handler";

interface CreateReleaseRequest {
  releaseType: 'LIMITED_TIME' | 'CLAIM_CODE';
  releaseStartAt?: string;
  releaseEndAt?: string;
  maxClaims?: number;
  generateCode?: boolean;
}

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

      const {
        releaseType,
        releaseStartAt,
        releaseEndAt,
        maxClaims,
        generateCode = false
      }: CreateReleaseRequest = req.body;

      if (!releaseType || !['LIMITED_TIME', 'CLAIM_CODE'].includes(releaseType)) {
        return res.status(400).json({
          error: "releaseType must be 'LIMITED_TIME' or 'CLAIM_CODE'"
        });
      }

      // Validate time-based releases
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

        if (startDate < new Date()) {
          return res.status(400).json({
            error: "releaseStartAt cannot be in the past"
          });
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
      const updateData: any = {
        releaseType,
        releaseStartAt: releaseStartAt ? new Date(releaseStartAt) : null,
        releaseEndAt: releaseEndAt ? new Date(releaseEndAt) : null,
        maxClaims: maxClaims || null,
        claimCode
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
        claimUrl: claimCode ? `${getSiteBaseUrl()}/claim/${claimCode}` : null
      });
    } catch (error) {
      console.error('Admin decoration release API error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);