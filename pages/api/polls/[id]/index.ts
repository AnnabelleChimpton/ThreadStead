import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Poll ID is required' });
  }

  try {
    const user = await getSessionUser(req);

    const poll = await db.poll.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            primaryHandle: true,
            role: true
          }
        },
        options: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const now = new Date();
    const isClosed = !poll.isActive || (poll.endsAt && poll.endsAt <= now);
    const totalVotes = poll._count.votes;

    // Check if user has voted
    let userVote = null;
    if (user) {
      const vote = await db.pollVote.findFirst({
        where: {
          pollId: poll.id,
          userId: user.id
        },
        select: { optionId: true }
      });
      userVote = vote ? vote.optionId : null;
    }

    return res.status(200).json({
      poll: {
        id: poll.id,
        question: poll.question,
        description: poll.description,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        endsAt: poll.endsAt,
        isActive: poll.isActive,
        isClosed,
        creator: poll.creator,
        totalVotes,
        userVote,
        options: poll.options.map((option) => ({
          id: option.id,
          text: option.text,
          order: option.order,
          voteCount: option._count.votes,
          percentage: totalVotes > 0
            ? Math.round((option._count.votes / totalVotes) * 100)
            : 0
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
