import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require authentication
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { roomId } = req.query;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string | undefined;

  if (typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Invalid room ID' });
  }

  try {
    // Check if room exists
    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Build query
    const where: any = { roomId };

    if (before) {
      where.id = { lt: before };
    }

    // Fetch messages
    const messages = await db.chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Transform to API format
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      roomId: msg.roomId,
      userId: msg.userId,
      handle: msg.user.primaryHandle,
      displayName: msg.user.profile?.displayName,
      avatarUrl: msg.user.profile?.avatarThumbnailUrl || msg.user.profile?.avatarUrl,
      body: msg.body,
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      messages: formattedMessages.reverse(), // Return oldest first
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
