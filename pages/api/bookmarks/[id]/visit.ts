import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

export default apiHandler(
  { methods: ['POST'], auth: 'user' },
  async (req, res, { user }) => {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Bookmark ID is required' });
      }

      // Verify bookmark belongs to user and update visit tracking
      const bookmark = await db.userBookmark.findFirst({
        where: {
          id,
          userId: user.id
        }
      });

      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      // Update visit count and last visited timestamp
      await db.userBookmark.update({
        where: { id },
        data: {
          visitsCount: { increment: 1 },
          lastVisitedAt: new Date()
        }
      });

      return res.json({ success: true });

    } catch (error) {
      console.error('Visit tracking error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
