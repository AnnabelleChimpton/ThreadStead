import type { NextApiRequest, NextApiResponse } from 'next';
import { apiHandler, ApiError } from '@/lib/api/handler';
import { db } from '../../../lib/config/database/connection';
import { ConsentType, ConsentAction } from '@prisma/client';
import { getClientIp } from '@/lib/server/http/client-ip';

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

/**
 * A signed-in user's own consent records. The user always comes from the
 * session; a leftover ?userId naming anyone else is refused. Signed-out
 * visitors have no records here (UserConsent belongs to a User) — the cookie
 * banner keeps their choice in localStorage.
 */
export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'user' },
  async (req, res: NextApiResponse<ConsentResponse>, { user }) => {
    const { userId } = req.query;
    if (userId !== undefined && userId !== user.id) {
      throw new ApiError(403, 'You can only manage your own consent');
    }

    if (req.method === 'GET') {
      return getConsents(user.id, res);
    }
    return updateConsents(user.id, req, res);
  }
);

async function getConsents(userId: string, res: NextApiResponse<ConsentResponse>) {
  try {
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

async function updateConsents(
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<ConsentResponse>
) {
  try {
    const { consents }: ConsentRequest = req.body;

    if (!consents || !Array.isArray(consents)) {
      return res.status(400).json({ success: false, error: 'Consents array required' });
    }

    // Get client IP and user agent for audit trail
    const ipAddress = getClientIp(req);
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
    return getConsents(userId, res);
  } catch (error) {
    console.error('Error updating consents:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}