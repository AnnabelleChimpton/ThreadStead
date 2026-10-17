import { db as prisma } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { sendForbiddenAdmin, sendUnauthenticated } from '@/lib/api/errors';

// GET is public; POST is admin-only (checked inline below)
export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'optional', rateLimit: 'admin' },
  async (req, res, { user }) => {
    if (req.method === 'GET') {
      // Public endpoint - anyone can read the founder's note
      try {
        const setting = await prisma.siteConfig.findUnique({
          where: { key: 'founders_note' }
        });

        return res.status(200).json({
          message: setting?.value || ''
        });
      } catch (error) {
        console.error('Error fetching founders note:', error);
        return res.status(500).json({ error: 'Failed to fetch founders note' });
      }
    }

    if (req.method === 'POST') {
      // Admin-only endpoint to update the founder's note
      if (!user) {
        return sendUnauthenticated(res);
      }
      if (user.role !== 'admin') {
        return sendForbiddenAdmin(res);
      }

      const { message } = req.body;

      if (typeof message !== 'string') {
        return res.status(400).json({ error: 'Message must be a string' });
      }

      try {
        await prisma.siteConfig.upsert({
          where: { key: 'founders_note' },
          update: { value: message },
          create: {
            key: 'founders_note',
            value: message
          }
        });

        return res.status(200).json({ success: true, message });
      } catch (error) {
        console.error('Error saving founders note:', error);
        return res.status(500).json({ error: 'Failed to save founders note' });
      }
    }
  }
);
