import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getSessionUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

export default withRateLimit('posts')(withCsrfProtection(handler));
