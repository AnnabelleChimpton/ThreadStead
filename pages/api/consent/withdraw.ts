import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/config/database/connection';
import { ConsentType, ConsentAction } from '@prisma/client';

interface WithdrawRequest {
  type?: ConsentType; // If not provided, withdraws all non-essential consents
}

interface WithdrawResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WithdrawResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    const { type }: WithdrawRequest = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Get client IP and user agent for audit trail
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                     req.connection.remoteAddress ||
                     null;
    const userAgent = req.headers['user-agent'] || null;

    await db.$transaction(async (tx) => {
      if (type) {
        // Withdraw specific consent type (except essential)
        if (type === ConsentType.ESSENTIAL) {
          throw new Error('Essential consents cannot be withdrawn');
        }

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
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}