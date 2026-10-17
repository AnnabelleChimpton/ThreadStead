import { apiHandler } from '@/lib/api/handler';
import { getUserBetaInviteCodes } from '@/lib/utils/invites/beta-codes';

export default apiHandler(
  { methods: ['GET'], auth: 'user' },
  async (req, res, { user }) => {
    try {
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
);
