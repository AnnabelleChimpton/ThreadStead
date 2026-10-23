import { db as prisma } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { findOrCreateDM } from '@/lib/chat/direct-messages';
import { getRestrictedUserIds } from '@/lib/domain/users/moderation';

// CSRF protection skips safe methods (GET/HEAD/OPTIONS) and validates POST
export default apiHandler(
    { methods: ['GET', 'POST'], auth: 'user' },
    async (req, res, { user }) => {
        const userId = user.id;

        if (req.method === 'GET') {
            try {
                // Conversations with a suspended, banned or leaving account drop
                // out while that lasts (they come back after a lift), unless it's you.
                const restricted = (await getRestrictedUserIds()).filter((id) => id !== userId);
                const conversations = await prisma.conversation.findMany({
                    where: {
                        participants: {
                            some: { userId }
                        },
                        ...(restricted.length
                            ? { NOT: { participants: { some: { userId: { in: restricted } } } } }
                            : {})
                    },
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        primaryHandle: true,
                                        profile: {
                                            select: {
                                                displayName: true,
                                                avatarThumbnailUrl: true,
                                                avatarUrl: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    },
                    orderBy: { updatedAt: 'desc' }
                });

                // Transform for easier consumption
                const formatted = await Promise.all(conversations.map(async c => {
                    const otherParticipant = c.participants.find(p => p.userId !== userId);
                    const myParticipant = c.participants.find(p => p.userId === userId);
                    const lastMessage = c.messages[0];

                    // Calculate unread count
                    const lastReadAt = myParticipant?.lastReadAt || new Date(0);
                    const unreadCount = await prisma.directMessage.count({
                        where: {
                            conversationId: c.id,
                            senderId: { not: userId },
                            createdAt: { gt: lastReadAt }
                        }
                    });

                    return {
                        id: c.id,
                        updatedAt: c.updatedAt,
                        otherUser: otherParticipant?.user,
                        lastMessage: lastMessage ? {
                            body: lastMessage.body,
                            createdAt: lastMessage.createdAt,
                            senderId: lastMessage.senderId,
                            isRead: lastMessage.isRead
                        } : null,
                        unreadCount
                    };
                }));

                return res.status(200).json(formatted);
            } catch (error) {
                console.error('Error fetching conversations:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        // POST: Start a conversation
        const { targetUserId } = req.body;
        if (!targetUserId || typeof targetUserId !== 'string') return res.status(400).json({ error: 'Target user required' });
        // Without this, the lookup below matched any DM of yours
        if (targetUserId === userId) return res.status(400).json({ error: 'You cannot message yourself' });

        try {
            const conversation = await findOrCreateDM(userId, targetUserId);
            return res.status(conversation.created ? 201 : 200).json({ id: conversation.id });
        } catch (error) {
            console.error('Error creating conversation:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);
