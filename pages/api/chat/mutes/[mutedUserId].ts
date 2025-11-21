import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
