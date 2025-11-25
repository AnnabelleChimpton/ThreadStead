import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { siteId } = req.body;

    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    // Check for existing vote
    const existingVote = await db.siteVote.findFirst({
      where: {
        siteId,
        userId: user.id,
        voteType: 'like' // We only care about 'like' votes now
      }
    });

    let liked = false;

    if (existingVote) {
      // Toggle off: Remove vote
      await db.$transaction([
        db.siteVote.delete({
          where: { id: existingVote.id }
        }),
        db.indexedSite.update({
          where: { id: siteId },
          data: { totalVotes: { decrement: 1 } }
        })
      ]);
      liked = false;
    } else {
      // Toggle on: Add vote
      // First, ensure no other vote types exist for this user/site to avoid unique constraint issues
      // (Migration script should handle this, but safety first)
      await db.siteVote.deleteMany({
        where: {
          siteId,
          userId: user.id
        }
      });

      await db.$transaction([
        db.siteVote.create({
          data: {
            siteId,
            userId: user.id,
            voteType: 'like'
          }
        }),
        db.indexedSite.update({
          where: { id: siteId },
          data: { totalVotes: { increment: 1 } }
        })
      ]);
      liked = true;
    }

    // Get updated count
    const site = await db.indexedSite.findUnique({
      where: { id: siteId },
      select: { totalVotes: true }
    });

    return res.json({
      success: true,
      liked,
      totalVotes: site?.totalVotes || 0
    });

  } catch (error) {
    console.error('Vote API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
}