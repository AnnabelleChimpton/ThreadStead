import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getSessionUser(req as any);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

export default withCsrfProtection(handler);