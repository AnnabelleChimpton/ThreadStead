import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/config/database/connection';
import { ConsentType, ConsentAction } from '@prisma/client';

interface ConsentRequest {
  consents: {
    type: ConsentType;
    granted: boolean;
  }[];
}

interface ConsentResponse {
  success: boolean;
  consents?: {
    type: ConsentType;
    granted: boolean;
    timestamp: string;
  }[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConsentResponse>
) {
  if (req.method === 'GET') {
    return getConsents(req, res);
  } else if (req.method === 'POST') {
    return updateConsents(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function getConsents(req: NextApiRequest, res: NextApiResponse<ConsentResponse>) {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const consents = await db.userConsent.findMany({
      where: { userId },
      select: {
        type: true,
        granted: true,
        timestamp: true,
      },
    });

    // Ensure all consent types are represented with defaults
    const allConsentTypes = Object.values(ConsentType);
    const consentMap = new Map(consents.map(c => [c.type, c]));

    const responseConsents = allConsentTypes.map(type => ({
      type,
      granted: consentMap.get(type)?.granted ?? (type === ConsentType.ESSENTIAL ? true : false),
      timestamp: consentMap.get(type)?.timestamp?.toISOString() ?? new Date().toISOString(),
    }));

    return res.json({
      success: true,
      consents: responseConsents,
    });
  } catch (error) {
    console.error('Error fetching consents:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function updateConsents(req: NextApiRequest, res: NextApiResponse<ConsentResponse>) {
  try {
    const { userId } = req.query;
    const { consents }: ConsentRequest = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    if (!consents || !Array.isArray(consents)) {
      return res.status(400).json({ success: false, error: 'Consents array required' });
    }

    // Get client IP and user agent for audit trail
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                     req.connection.remoteAddress ||
                     null;
    const userAgent = req.headers['user-agent'] || null;

    await db.$transaction(async (tx) => {
      for (const consent of consents) {
        // Essential cookies cannot be disabled
        if (consent.type === ConsentType.ESSENTIAL && !consent.granted) {
          continue;
        }

        // Get current consent state
        const currentConsent = await tx.userConsent.findUnique({
          where: {
            userId_type: {
              userId,
              type: consent.type,
            },
          },
        });

        const isNewConsent = !currentConsent;
        const isChanged = currentConsent && currentConsent.granted !== consent.granted;

        if (isNewConsent || isChanged) {
          // Update or create consent record
          await tx.userConsent.upsert({
            where: {
              userId_type: {
                userId,
                type: consent.type,
              },
            },
            update: {
              granted: consent.granted,
              timestamp: new Date(),
              ipAddress,
              userAgent,
              withdrawnAt: consent.granted ? null : new Date(),
            },
            create: {
              userId,
              type: consent.type,
              granted: consent.granted,
              ipAddress,
              userAgent,
              withdrawnAt: consent.granted ? null : new Date(),
            },
          });

          // Log the consent action
          await tx.consentLog.create({
            data: {
              userId,
              type: consent.type,
              action: isNewConsent ? ConsentAction.GRANTED : ConsentAction.UPDATED,
              granted: consent.granted,
              ipAddress,
              userAgent,
            },
          });
        }
      }
    });

    // Return updated consents
    return getConsents(req, res);
  } catch (error) {
    console.error('Error updating consents:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}