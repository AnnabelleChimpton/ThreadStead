import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { getUserBetaInviteCodes } from '@/lib/beta-invite-codes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the current user from session
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch user's beta invite codes
    const inviteCodes = await getUserBetaInviteCodes(user.id);

    return res.status(200).json({
      codes: inviteCodes.map(code => ({
        id: code.id,
        code: code.code,
        createdAt: code.createdAt,
        usedAt: code.usedAt,
        isUsed: !!code.usedBy,
        usedBy: code.user ? {
          displayName: code.user.profile?.displayName || code.user.primaryHandle?.split('@')[0] || 'Unknown User',
          handle: code.user.primaryHandle
        } : null
      }))
    });
  } catch (error) {
    console.error('Error fetching beta invite codes:', error);
    return res.status(500).json({ error: 'Failed to fetch beta invite codes' });
  }
}