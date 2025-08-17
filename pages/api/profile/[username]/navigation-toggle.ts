import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth-server';
import { PrismaClient } from '@prisma/client';
import { SITE_NAME } from '@/lib/site-config';

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query;
    
    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    if (req.method === 'POST') {
      // Toggle navigation visibility
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { hideNavigation } = req.body;

      if (typeof hideNavigation !== 'boolean') {
        return res.status(400).json({ error: 'Invalid hideNavigation value' });
      }

      // Check if user can modify this profile
      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true, primaryHandle: true } } }
      });

      if (!handle) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
      if (currentUsername !== username && user.id !== handle.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update or create profile with navigation visibility setting
      await db.profile.upsert({
        where: { userId: handle.user.id },
        update: { hideNavigation },
        create: {
          userId: handle.user.id,
          hideNavigation
        }
      });

      return res.status(200).json({ success: true, hideNavigation });

    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Navigation toggle API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}