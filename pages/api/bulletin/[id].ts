import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

export default apiHandler(
  { methods: ['DELETE'], auth: 'user', rateLimit: 'posts' },
  async (req, res, { user }) => {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid bulletin ID' });
      }

      // Find the bulletin
      const bulletin = await db.bulletin.findUnique({
        where: { id },
      });

      if (!bulletin) {
        return res.status(404).json({ error: 'Bulletin not found' });
      }

      // Check permission: user can only delete their own bulletin unless admin
      if (bulletin.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only delete your own bulletins' });
      }

      // Soft delete: mark as inactive
      await db.bulletin.update({
        where: { id },
        data: {
          isActive: false,
          expiresAt: new Date(), // Set expiration to now
        },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting bulletin:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
