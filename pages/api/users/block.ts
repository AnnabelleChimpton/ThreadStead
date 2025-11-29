import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db as prisma } from '@/lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await getSessionUser(req);

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    if (req.method === 'POST') {
        const { targetUserId, action } = req.body;

        if (!targetUserId || !['block', 'unblock'].includes(action)) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        if (targetUserId === userId) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }

        try {
            if (action === 'block') {
                await prisma.userBlock.upsert({
                    where: {
                        blockerId_blockedUserId: {
                            blockerId: userId,
                            blockedUserId: targetUserId,
                        },
                    },
                    update: {},
                    create: {
                        blockerId: userId,
                        blockedUserId: targetUserId,
                    },
                });
            } else {
                await prisma.userBlock.deleteMany({
                    where: {
                        blockerId: userId,
                        blockedUserId: targetUserId,
                    },
                });
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error updating block status:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'GET') {
        try {
            const blocks = await prisma.userBlock.findMany({
                where: {
                    blockerId: userId,
                    blockedUserId: { not: null },
                },
                select: {
                    blockedUserId: true,
                },
            });

            return res.status(200).json({ blockedUserIds: blocks.map(b => b.blockedUserId) });
        } catch (error) {
            console.error('Error fetching blocks:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
