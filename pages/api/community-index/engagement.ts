import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

/**
 * Engagement Metrics API
 * Tracks meaningful user interactions with community sites
 * Replaces superficial voting with actual usage patterns
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = '30d', limit = '20' } = req.query;

    // Calculate engagement metrics for sites
    const metrics = await calculateEngagementMetrics(period as string, parseInt(limit as string));

    return res.json({
      success: true,
      period,
      metrics,
      description: 'Sites ranked by actual user engagement rather than votes'
    });

  } catch (error) {
    console.error('Engagement metrics error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function calculateEngagementMetrics(period: string, limit: number) {
  // Calculate date range
  let startDate: Date;
  switch (period) {
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get all validated sites
  const sites = await db.indexedSite.findMany({
    where: {
      communityValidated: true
    },
    include: {
      bookmarkSubmissions: {
        include: {
          bookmark: {
            select: {
              id: true,
              visitsCount: true,
              lastVisitedAt: true,
              createdAt: true,
              userId: true
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
  });

  // Calculate engagement score for each site
  const sitesWithEngagement = sites.map(site => {
    const engagement = calculateSiteEngagement(site, startDate);
    return {
      id: site.id,
      url: site.url,
      title: site.title,
      description: site.description,
      siteType: site.siteType,
      discoveryMethod: site.discoveryMethod,
      communityScore: site.communityScore,
      engagementMetrics: engagement
    };
  });

  // Sort by engagement score (descending)
  sitesWithEngagement.sort((a, b) => b.engagementMetrics.totalScore - a.engagementMetrics.totalScore);

  return sitesWithEngagement.slice(0, limit);
}

function calculateSiteEngagement(site: any, startDate: Date) {
  let totalScore = 0;
  let totalBookmarks = 0;
  let totalVisits = 0;
  let recentVisits = 0;
  const activeUsers = new Set();
  let retentionRate = 0;

  // Process bookmark data
  for (const submission of site.bookmarkSubmissions || []) {
    const bookmark = submission.bookmark;
    if (!bookmark) continue;

    totalBookmarks++;
    totalVisits += bookmark.visitsCount;
    activeUsers.add(bookmark.userId);

    // Count recent visits
    if (bookmark.lastVisitedAt && new Date(bookmark.lastVisitedAt) >= startDate) {
      recentVisits++;
    }

    // Calculate retention: users who bookmarked and then actually visited
    if (bookmark.visitsCount > 0) {
      retentionRate++;
    }
  }

  // Calculate retention rate percentage
  retentionRate = totalBookmarks > 0 ? (retentionRate / totalBookmarks) * 100 : 0;

  // Engagement scoring algorithm
  const bookmarkScore = totalBookmarks * 10; // Each bookmark worth 10 points
  const visitScore = totalVisits * 2; // Each visit worth 2 points
  const recentActivityScore = recentVisits * 5; // Recent visits worth more
  const uniqueUserScore = activeUsers.size * 15; // Diverse user base bonus
  const retentionBonus = retentionRate * 0.5; // Retention percentage bonus
  const discoveryMethodBonus = getDiscoveryMethodBonus(site.discoveryMethod);

  totalScore = bookmarkScore + visitScore + recentActivityScore + uniqueUserScore + retentionBonus + discoveryMethodBonus;

  return {
    totalScore: Math.round(totalScore),
    breakdown: {
      bookmarks: totalBookmarks,
      totalVisits,
      recentVisits,
      uniqueUsers: activeUsers.size,
      retentionRate: Math.round(retentionRate),
      discoveryMethod: site.discoveryMethod
    },
    scoring: {
      bookmarkScore,
      visitScore,
      recentActivityScore,
      uniqueUserScore,
      retentionBonus: Math.round(retentionBonus),
      discoveryMethodBonus
    }
  };
}

function getDiscoveryMethodBonus(discoveryMethod: string): number {
  switch (discoveryMethod) {
    case 'user_bookmark': return 20; // Human saves get highest bonus
    case 'manual_submit': return 15; // Manual submissions get good bonus
    case 'api_seeding': return 5; // Crawler gets small bonus
    default: return 0;
  }
}