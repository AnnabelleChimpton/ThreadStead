/**
 * Community validation API for indexed sites
 * Allows community members to vote on seeded sites
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const user = await getSessionUser(req as any);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'GET') {
      // Get sites pending validation
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const showInteracted = req.query.showInteracted === 'true';
      const sortMethod = req.query.sort as string || 'balanced';

      const where: any = {
        discoveryMethod: 'api_seeding',
        communityValidated: false
      };

      if (category && category !== 'all') {
        where.siteType = category;
      }

      // Filter out sites user has already interacted with (unless explicitly requested)
      if (!showInteracted) {
        // Exclude sites where user has voted
        where.votes = {
          none: {
            userId: user.id
          }
        };
      } else {
        // Only show sites where user has interacted
        where.votes = {
          some: {
            userId: user.id
          }
        };
      }

      // Determine ordering strategy to reduce bias
      let orderBy: any[] = [];

      switch (sortMethod) {
        case 'newest':
          orderBy = [{ discoveredAt: 'desc' }];
          break;
        case 'oldest':
          orderBy = [{ discoveredAt: 'asc' }];
          break;
        case 'highest_score':
          orderBy = [{ seedingScore: 'desc' }, { discoveredAt: 'desc' }];
          break;
        case 'lowest_score':
          orderBy = [{ seedingScore: 'asc' }, { discoveredAt: 'asc' }];
          break;
        case 'most_votes':
          orderBy = [{ totalVotes: 'desc' }, { discoveredAt: 'desc' }];
          break;
        case 'least_votes':
          orderBy = [{ totalVotes: 'asc' }, { discoveredAt: 'asc' }];
          break;
        case 'balanced':
        default:
          // Balanced approach: Mix of factors to reduce bias
          // Priority: sites with fewer votes, then mixed score/age
          orderBy = [
            { totalVotes: 'asc' },        // Prioritize unvoted sites
            { seedingScore: 'desc' },     // Then quality
            { discoveredAt: 'desc' }      // Then recency
          ];
          break;
      }

      const [sites, total] = await Promise.all([
        db.indexedSite.findMany({
          where,
          orderBy,
          skip: page * limit,
          take: limit,
          include: {
            votes: {
              include: {
                user: {
                  select: {
                    id: true,
                    primaryHandle: true
                  }
                }
              }
            },
            _count: {
              select: {
                votes: true
              }
            }
          }
        }),
        db.indexedSite.count({ where })
      ]);

      // Calculate user's existing votes
      const sitesWithUserVotes = await Promise.all(
        sites.map(async (site) => {
          const userVote = await db.siteVote.findFirst({
            where: {
              siteId: site.id,
              userId: user.id
            }
          });

          return {
            ...site,
            userVote: userVote?.voteType || null,
            votesSummary: {
              approve: site.votes.filter(v => v.voteType === 'approve').length,
              reject: site.votes.filter(v => v.voteType === 'reject').length,
              improve: site.votes.filter(v => v.voteType === 'improve').length,
              quality: site.votes.filter(v => v.voteType === 'quality').length,
              interesting: site.votes.filter(v => v.voteType === 'interesting').length,
              helpful: site.votes.filter(v => v.voteType === 'helpful').length,
              creative: site.votes.filter(v => v.voteType === 'creative').length,
              broken: site.votes.filter(v => v.voteType === 'broken').length,
              spam: site.votes.filter(v => v.voteType === 'spam').length,
              outdated: site.votes.filter(v => v.voteType === 'outdated').length
            }
          };
        })
      );

      return res.json({
        success: true,
        sites: sitesWithUserVotes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (req.method === 'POST') {
      // Submit a validation vote
      const { siteId, action, comment } = req.body;

      if (!siteId || !action) {
        return res.status(400).json({ error: 'Site ID and action are required' });
      }

      // Enhanced vote types from Phase 2
      const validVoteTypes = [
        'approve', 'reject', 'improve',
        'quality', 'interesting', 'helpful', 'creative',
        'broken', 'spam', 'outdated'
      ];

      if (!validVoteTypes.includes(action)) {
        return res.status(400).json({ error: 'Invalid vote type' });
      }

      // Check if site exists
      const site = await db.indexedSite.findUnique({
        where: { id: siteId }
      });

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Check if user already voted
      const existingVote = await db.siteVote.findFirst({
        where: {
          siteId,
          userId: user.id
        }
      });

      if (existingVote) {
        // Update existing vote
        await db.siteVote.update({
          where: { id: existingVote.id },
          data: {
            voteType: action,
            comment: comment || null
          }
        });
      } else {
        // Create new vote
        await db.siteVote.create({
          data: {
            siteId,
            userId: user.id,
            voteType: action,
            comment: comment || null
          }
        });
      }

      // Update validation status if enough votes
      await updateValidationStatus(siteId);

      return res.json({
        success: true,
        message: 'Vote recorded successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Validation API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update validation status based on enhanced community votes
 */
async function updateValidationStatus(siteId: string) {
  const votes = await db.siteVote.findMany({
    where: { siteId }
  });

  // Calculate different vote categories
  const approveVotes = votes.filter(v => v.voteType === 'approve').length;
  const rejectVotes = votes.filter(v => v.voteType === 'reject').length;
  const qualityVotes = votes.filter(v => ['quality', 'interesting', 'helpful', 'creative'].includes(v.voteType)).length;
  const problemVotes = votes.filter(v => ['broken', 'spam', 'outdated'].includes(v.voteType)).length;
  const improveVotes = votes.filter(v => v.voteType === 'improve').length;

  const totalVotes = votes.length;

  // Enhanced validation thresholds
  const MIN_VOTES = 3; // Minimum votes needed for validation
  const APPROVE_THRESHOLD = 0.6; // 60% approval rate needed
  const PROBLEM_THRESHOLD = 2; // 2+ problem votes = immediate rejection

  // Calculate community score based on weighted votes
  let communityScore = 0;
  communityScore += approveVotes * 3; // Approve votes worth 3 points
  communityScore += qualityVotes * 2; // Quality votes worth 2 points
  communityScore += improveVotes * 1; // Improve votes worth 1 point
  communityScore -= rejectVotes * 3; // Reject votes lose 3 points
  communityScore -= problemVotes * 4; // Problem votes lose 4 points

  if (totalVotes >= MIN_VOTES) {
    // Check for immediate rejection due to problems
    if (problemVotes >= PROBLEM_THRESHOLD) {
      await db.indexedSite.update({
        where: { id: siteId },
        data: {
          communityValidated: false,
          communityScore: Math.min(communityScore, -5), // Cap negative score
          validationVotes: totalVotes
        }
      });
      return;
    }

    // Calculate approval rate including quality votes
    const positiveVotes = approveVotes + qualityVotes;
    const negativeVotes = rejectVotes + problemVotes;
    const approvalRate = positiveVotes / (positiveVotes + negativeVotes);

    if (approvalRate >= APPROVE_THRESHOLD && communityScore > 0) {
      // Approve the site
      await db.indexedSite.update({
        where: { id: siteId },
        data: {
          communityValidated: true,
          communityScore,
          validationVotes: totalVotes
        }
      });
    } else if (negativeVotes > positiveVotes && totalVotes >= MIN_VOTES) {
      // Reject the site (can override auto-validation)
      await db.indexedSite.update({
        where: { id: siteId },
        data: {
          communityValidated: false,
          communityScore,
          validationVotes: totalVotes
        }
      });
    } else {
      // Still pending or maintaining current validation status
      // Update score but preserve existing validation status for auto-validated sites
      const currentSite = await db.indexedSite.findUnique({
        where: { id: siteId },
        select: { communityValidated: true, discoveryMethod: true }
      });

      // If it's auto-validated from seeding, keep it validated unless explicitly rejected
      const shouldStayValidated = currentSite?.communityValidated &&
                                  currentSite?.discoveryMethod === 'api_seeding' &&
                                  communityScore >= 0; // Only if score isn't negative

      await db.indexedSite.update({
        where: { id: siteId },
        data: {
          communityValidated: shouldStayValidated || false,
          communityScore,
          validationVotes: totalVotes
        }
      });
    }
  }
}