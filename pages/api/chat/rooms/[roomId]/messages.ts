import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rooms are read-only-public: the socket server already streams live messages
  // to logged-out visitors, so history is readable without auth to match. (Only
  // sending — handled over the socket — requires a logged-in account.)

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

    // Fetch newest-first, then reverse for display. `before` is a message id
    // used as a Prisma cursor so pagination follows the createdAt ordering
    // exactly — ids are cuids and are NOT time-sortable, so an `id < before`
    // comparison would skip or repeat messages.
    const messages = await db.chatMessage.findMany({
      where: { roomId },
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
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
      isAction: msg.isAction,
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
