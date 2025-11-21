import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

// Import from TypeScript definitions (backed by presence.js for server.js compatibility)
import { getRoomPresence } from '@/lib/chat/presence';

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

    // Get current presence from server's in-memory store
    const users = getRoomPresence(roomId);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
