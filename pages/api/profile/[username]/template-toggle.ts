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

    if (req.method === 'POST') {
      // Toggle template enabled status
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid enabled value' });
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

      // Update or create profile with template enabled status
      await db.profile.upsert({
        where: { userId: handle.user.id },
        update: { templateEnabled: enabled },
        create: {
          userId: handle.user.id,
          templateEnabled: enabled
        }
      });

      return res.status(200).json({ success: true, enabled });

    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Template toggle API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}