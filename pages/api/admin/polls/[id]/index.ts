import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';
import { z } from 'zod';

const updatePollSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Poll ID is required' });
  }

  try {
    const user = await getSessionUser(req);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if poll exists
    const poll = await db.poll.findUnique({
      where: { id }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (req.method === 'PATCH') {
      // Update poll
      const validatedData = updatePollSchema.parse(req.body);
      const { question, description, endsAt, isActive } = validatedData;

      // Validate and parse endsAt if provided
      let parsedEndsAt: Date | null | undefined = undefined;
      if (endsAt !== undefined) {
        if (endsAt === null) {
          parsedEndsAt = null;
        } else {
          parsedEndsAt = new Date(endsAt);
          if (isNaN(parsedEndsAt.getTime())) {
            return res.status(400).json({ error: 'Invalid date format for endsAt' });
          }
        }
      }

      // If activating this poll, deactivate all others
      if (isActive === true && !poll.isActive) {
        await db.poll.updateMany({
          where: {
            isActive: true,
            NOT: { id }
          },
          data: { isActive: false }
        });
      }

      const updatedPoll = await db.poll.update({
        where: { id },
        data: {
          ...(question !== undefined && { question: question.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(parsedEndsAt !== undefined && { endsAt: parsedEndsAt }),
          ...(isActive !== undefined && { isActive })
        },
        include: {
          options: {
            orderBy: { order: 'asc' }
          },
          creator: {
            select: {
              id: true,
              primaryHandle: true,
              role: true
            }
          },
          _count: {
            select: { votes: true }
          }
        }
      });

      return res.status(200).json({
        message: 'Poll updated successfully',
        poll: updatedPoll
      });
    }

    if (req.method === 'DELETE') {
      // Delete poll (cascades to options and votes)
      await db.poll.delete({
        where: { id }
      });

      return res.status(200).json({
        message: 'Poll deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin poll update/delete error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    // Prisma not found error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Poll not found' });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withRateLimit('admin')(withCsrfProtection(handler));
