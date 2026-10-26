import { apiHandler } from '@/lib/api/handler';
import { db as prisma } from '@/lib/config/database/connection';
import { forgetChatBlocks } from '@/lib/chat/block-cache';
import { z } from 'zod';

/** What BlockButton and the chat panel send; an object id went into the unblock filter as a condition */
const blockSchema = z.object({
    targetUserId: z.string().min(1).max(200),
    action: z.enum(['block', 'unblock']),
});

// CSRF protection (apiHandler default) skips safe methods (GET/HEAD/OPTIONS) and validates POST
export default apiHandler(
    { methods: ['GET', 'POST'], auth: 'user', schema: blockSchema },
    async (req, res, { user, body }) => {
        const userId = user.id;

        if (req.method === 'POST') {
            const { targetUserId, action } = body;

            if (targetUserId === userId) {
                return res.status(400).json({ error: "You can't block yourself." });
            }

            try {
                if (action === 'block') {
                    // A made-up id was a foreign-key 500
                    if (!(await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } }))) {
                        return res.status(404).json({ error: "There's nobody here by that id." });
                    }
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
                forgetChatBlocks(userId, targetUserId);

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
    }
);
