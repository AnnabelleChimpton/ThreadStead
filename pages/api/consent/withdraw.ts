import type { NextApiResponse } from 'next';
import { apiHandler, ApiError } from '@/lib/api/handler';
import { db } from '../../../lib/config/database/connection';
import { ConsentType, ConsentAction } from '@prisma/client';
import { getClientIp } from '@/lib/server/http/client-ip';
import { z } from 'zod';

/** One type to withdraw; left out, every non-essential one (ConsentManager sends {}) */
const withdrawSchema = z.object({ type: z.enum(ConsentType).optional() });

interface WithdrawResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/** Withdraws the signed-in user's own consents; see consent/manage.ts. */
export default apiHandler(
  { methods: ['POST'], auth: 'user', schema: withdrawSchema },
  async (req, res: NextApiResponse<WithdrawResponse>, { user, body }) => {
    if (req.query.userId !== undefined && req.query.userId !== user.id) {
      throw new ApiError(403, 'You can only manage your own consent');
    }
    const userId = user.id;
    const { type } = body;
    // Was thrown inside the transaction and answered as a 500
    if (type === ConsentType.ESSENTIAL) {
      return res.status(400).json({ success: false, error: "Essential cookies keep you signed in, so they can't be turned off." });
    }

    try {

      // Get client IP and user agent for audit trail
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'] || null;

      await db.$transaction(async (tx) => {
        if (type) {
          await tx.userConsent.upsert({
            where: {
              userId_type: {
                userId,
                type,
              },
            },
            update: {
              granted: false,
              timestamp: new Date(),
              withdrawnAt: new Date(),
              ipAddress,
              userAgent,
            },
            create: {
              userId,
              type,
              granted: false,
              withdrawnAt: new Date(),
              ipAddress,
              userAgent,
            },
          });

          // Log the withdrawal
          await tx.consentLog.create({
            data: {
              userId,
              type,
              action: ConsentAction.WITHDRAWN,
              granted: false,
              ipAddress,
              userAgent,
            },
          });
        } else {
          // Withdraw all non-essential consents
          const nonEssentialTypes = Object.values(ConsentType).filter(
            t => t !== ConsentType.ESSENTIAL
          );

          for (const consentType of nonEssentialTypes) {
            await tx.userConsent.upsert({
              where: {
                userId_type: {
                  userId,
                  type: consentType,
                },
              },
              update: {
                granted: false,
                timestamp: new Date(),
                withdrawnAt: new Date(),
                ipAddress,
                userAgent,
              },
              create: {
                userId,
                type: consentType,
                granted: false,
                withdrawnAt: new Date(),
                ipAddress,
                userAgent,
              },
            });

            // Log the withdrawal
            await tx.consentLog.create({
              data: {
                userId,
                type: consentType,
                action: ConsentAction.WITHDRAWN,
                granted: false,
                ipAddress,
                userAgent,
              },
            });
          }
        }
      });

      const message = type
        ? `Consent for ${type.toLowerCase()} has been withdrawn`
        : 'All non-essential consents have been withdrawn';

      return res.json({
        success: true,
        message,
      });
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);