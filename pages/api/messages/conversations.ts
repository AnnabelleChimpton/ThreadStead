import { NextApiRequest, NextApiResponse } from 'next';
import { db as prisma } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await getSessionUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    if (req.method === 'GET') {
        try {
            const conversations = await prisma.conversation.findMany({
                where: {
                    participants: {
                        some: { userId }
                    }
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
    } else if (req.method === 'POST') {
        // Start a conversation
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'Target user required' });

        try {
            // Check existing
            const existingConversations = await prisma.conversation.findMany({
                where: {
                    AND: [
                        { participants: { some: { userId } } },
                        { participants: { some: { userId: targetUserId } } }
                    ]
                },
                include: { participants: true }
            });

            const existing = existingConversations.find(c => c.participants.length === 2);

            if (existing) {
                return res.status(200).json({ id: existing.id });
            }

            const conversation = await prisma.conversation.create({
                data: {
                    participants: {
                        create: [
                            { userId },
                            { userId: targetUserId }
                        ]
                    }
                }
            });

            return res.status(201).json({ id: conversation.id });
        } catch (error) {
            console.error('Error creating conversation:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
