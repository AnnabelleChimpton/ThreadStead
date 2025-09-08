import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from "@/lib/db";
import { SITE_NAME } from '@/lib/site-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query;
    
    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user can access this profile
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: { user: { select: { id: true, primaryHandle: true } } }
    });

    if (!handle) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow access to own profile
    const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
    if (currentUsername !== username && user.id !== handle.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      // Get current template mode
      const profile = await db.profile.findUnique({
        where: { userId: handle.user.id },
        select: { templateMode: true }
      });

      return res.status(200).json({
        templateMode: profile?.templateMode || 'default'
      });

    } else if (req.method === 'POST') {
      // Update template mode
      const { templateMode } = req.body;

      if (!templateMode || !['default', 'enhanced', 'advanced'].includes(templateMode)) {
        return res.status(400).json({ error: 'Invalid template mode' });
      }

      // Update or create profile with new template mode
      await db.profile.upsert({
        where: { userId: handle.user.id },
        update: { templateMode },
        create: {
          userId: handle.user.id,
          templateMode
        }
      });

      return res.status(200).json({ success: true, templateMode });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Template mode API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}