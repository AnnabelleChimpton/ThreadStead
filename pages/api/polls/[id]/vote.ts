import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';
import { z } from 'zod';

const voteSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required')
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Poll ID is required' });
  }

  try {
    const user = await getSessionUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validatedData = voteSchema.parse(req.body);
    const { optionId } = validatedData;

    // Check if poll exists and is active
    const poll = await db.poll.findUnique({
      where: { id },
      include: {
        options: true
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const now = new Date();
    const isClosed = !poll.isActive || (poll.endsAt && poll.endsAt <= now);

    if (isClosed) {
      return res.status(400).json({ error: 'Poll is closed' });
    }

    // Verify option belongs to this poll
    const validOption = poll.options.find((opt) => opt.id === optionId);
    if (!validOption) {
      return res.status(400).json({ error: 'Invalid option for this poll' });
    }

    // Check if user has already voted
    const existingVote = await db.pollVote.findUnique({
      where: {
        pollId_userId: {
          pollId: id,
          userId: user.id
        }
      }
    });

    if (existingVote) {
      // User preference: Allow vote changes - update existing vote
      if (existingVote.optionId === optionId) {
        return res.status(200).json({
          message: 'Vote already recorded',
          vote: existingVote
        });
      }

      // Update vote to new option
      const updatedVote = await db.pollVote.update({
        where: {
          pollId_userId: {
            pollId: id,
            userId: user.id
          }
        },
        data: {
          optionId,
          votedAt: new Date()
        }
      });

      return res.status(200).json({
        message: 'Vote updated successfully',
        vote: updatedVote
      });
    }

    // Create new vote
    const vote = await db.pollVote.create({
      data: {
        pollId: id,
        optionId,
        userId: user.id
      }
    });

    return res.status(201).json({
      message: 'Vote recorded successfully',
      vote
    });
  } catch (error) {
    console.error('Error recording vote:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withRateLimit('polls')(withCsrfProtection(handler));
