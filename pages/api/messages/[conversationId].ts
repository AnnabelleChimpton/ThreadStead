import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '../../../lib/auth/server';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await getSessionUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.query;

    if (!conversationId || typeof conversationId !== 'string') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Verify participation
    const participant = await prisma.conversationParticipant.findUnique({
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

    if (req.method === 'GET') {
        try {
            const messages = await prisma.directMessage.findMany({
                where: { conversationId },
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

    return res.status(405).json({ error: 'Method not allowed' });
}
