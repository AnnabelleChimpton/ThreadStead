import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { parseLimit } from '@/lib/server/http/pagination';
import { getHiddenIds } from '@/lib/domain/users/blocks';
import { PROFILE_WITHOUT_PAGE } from '@/lib/domain/profile/profile-fields';

export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user }) => {
    // Rooms are read-only-public: the socket server already streams live messages
    // to logged-out visitors, so history is readable without auth to match. (Only
    // sending — handled over the socket — requires a logged-in account.)
    // History leaves out suspended and banned accounts for everyone, and the
    // people the viewer blocked (the panel hides those live too).

    const { roomId } = req.query;
    const limit = parseLimit(req.query.limit, { fallback: 50, max: 100 });
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
      const { blockedUserIds: hidden } = await getHiddenIds(user?.id);
      const messages = await db.chatMessage.findMany({
        where: { roomId, ...(hidden.length ? { userId: { notIn: hidden } } : {}) },
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(before ? { cursor: { id: before }, skip: 1 } : {}),
        include: {
          user: {
            include: {
              profile: PROFILE_WITHOUT_PAGE,
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
);
