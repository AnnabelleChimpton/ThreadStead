import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getSessionUser(req);

    // Get active polls and recent closed polls (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const now = new Date();

    const polls = await db.poll.findMany({
      where: {
        OR: [
          // Active polls that haven't expired
          {
            isActive: true,
            OR: [
              { endsAt: null },
              { endsAt: { gt: now } }
            ]
          },
          // Recent closed polls (closed in last 30 days)
          {
            isActive: false,
            updatedAt: { gte: thirtyDaysAgo }
          },
          // Expired polls from last 30 days
          {
            endsAt: { lte: now, gte: thirtyDaysAgo }
          }
        ]
      },
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
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Transform polls to include vote counts and user's vote
    const pollsWithVotes = await Promise.all(
      polls.map(async (poll) => {
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

        // Calculate if poll is closed
        const isClosed = !poll.isActive || (poll.endsAt && poll.endsAt <= now);

        return {
          id: poll.id,
          question: poll.question,
          description: poll.description,
          createdAt: poll.createdAt,
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
        };
      })
    );

    return res.status(200).json({ polls: pollsWithVotes });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
