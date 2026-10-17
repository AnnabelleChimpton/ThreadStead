import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

export default apiHandler(
  { methods: ['DELETE'], auth: 'user' },
  async (req, res, { user }) => {
    const { mutedUserId } = req.query;

    if (typeof mutedUserId !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      // Delete the mute
      await db.chatMute.deleteMany({
        where: {
          userId: user.id,
          mutedUserId,
        },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting mute:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
