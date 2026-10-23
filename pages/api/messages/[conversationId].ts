import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { getRestrictedUserIds } from '@/lib/domain/users/moderation';

export default apiHandler(
    { methods: ['GET'], auth: 'user' },
    async (req, res, { user }) => {
        const { conversationId } = req.query;

        if (!conversationId || typeof conversationId !== 'string') {
            return res.status(400).json({ error: 'Invalid conversation ID' });
        }

        // Verify participation
        const participant = await db.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: user.id
                }
            }
        });

        if (!participant) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        try {
            // Nothing from a suspended, banned or leaving account (the
            // conversation list leaves those out too), but your own stay yours.
            const restricted = (await getRestrictedUserIds()).filter((id) => id !== user.id);
            const messages = await db.directMessage.findMany({
                where: { conversationId, ...(restricted.length ? { senderId: { notIn: restricted } } : {}) },
                orderBy: { createdAt: 'desc' },
                take: 50, // Pagination limit
                include: {
                    sender: {
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
            });

            return res.status(200).json(messages.reverse()); // Return oldest first for chat UI
        } catch (error) {
            console.error('Error fetching messages:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);
