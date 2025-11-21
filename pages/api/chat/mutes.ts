import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Get list of muted users
    try {
      const mutes = await db.chatMute.findMany({
        where: { userId: user.id },
        select: {
          mutedUserId: true,
          createdAt: true,
          mutedUser: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        mutes: mutes.map(m => ({
          userId: m.mutedUserId,
          handle: m.mutedUser.primaryHandle,
          displayName: m.mutedUser.profile?.displayName,
          mutedAt: m.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching mutes:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    // Create a mute
    const { mutedUserId } = req.body;

    if (!mutedUserId || typeof mutedUserId !== 'string') {
      return res.status(400).json({ error: 'mutedUserId is required' });
    }

    if (mutedUserId === user.id) {
      return res.status(400).json({ error: 'Cannot mute yourself' });
    }

    try {
      // Check if user exists
      const mutedUser = await db.user.findUnique({
        where: { id: mutedUserId },
      });

      if (!mutedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create or update mute
      const mute = await db.chatMute.upsert({
        where: {
          userId_mutedUserId: {
            userId: user.id,
            mutedUserId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          mutedUserId,
        },
      });

      return res.status(200).json({ success: true, mute });
    } catch (error) {
      console.error('Error creating mute:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
