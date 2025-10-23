/**
 * Discovery Feeds System
 * Provides curated feeds of recently found, favorite, and hidden gem sites
 */

import { db } from '@/lib/config/database/connection';

export interface FeedSite {
  id: string;
  url: string;
  title: string;
  description?: string;
  siteType?: string;
  discoveredAt: Date;
  discoveryMethod: string;
  communityScore: number;
  validationVotes: number;
  tags: string[];
  recentActivity: {
    views: number;
    votes: number;
    discoveries: number;
  };
  discoveredBy?: {
    id: string;
    handle: string;
  };
}

export interface DiscoveryFeed {
  type: 'recent' | 'favorites' | 'hidden_gems' | 'trending' | 'user_recommendations';
  title: string;
  description: string;
  sites: FeedSite[];
  metadata: {
    totalCount: number;
    lastUpdated: Date;
    criteria: string;
  };
}

export class DiscoveryFeedsManager {
  /**
   * Get recently discovered sites feed
   */
  async getRecentlyFoundFeed(
    limit: number = 20,
    category?: string,
    userId?: string
  ): Promise<DiscoveryFeed> {
    const where: any = {
      communityValidated: true,
      indexingPurpose: { not: 'rejected' }, // Exclude rejected sites
      discoveredAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    };

    if (category && category !== 'all') {
      where.siteType = category;
    }

    const sites = await db.indexedSite.findMany({
      where,
      orderBy: { discoveredAt: 'desc' },
      take: limit,
      include: {
        tags: true,
        submitter: {
          select: { id: true, primaryHandle: true }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    const feedSites = await this.enrichSitesWithActivity(sites);

    return {
      type: 'recent',
      title: 'Recently Discovered',
      description: 'Sites that have been discovered and validated by the community in the last 30 days',
      sites: feedSites,
      metadata: {
        totalCount: await db.indexedSite.count({ where }),
        lastUpdated: new Date(),
        criteria: category ? `Category: ${category}` : 'All categories'
      }
    };
  }

  /**
   * Get community favorites feed (high community scores)
   */
  async getFavoritesFeed(
    limit: number = 20,
    category?: string,
    userId?: string
  ): Promise<DiscoveryFeed> {
    const where: any = {
      communityValidated: true,
      indexingPurpose: { not: 'rejected' }, // Exclude rejected sites
      communityScore: { gte: 15 }, // High community score threshold
      validationVotes: { gte: 5 }  // Minimum votes for statistical relevance
    };

    if (category && category !== 'all') {
      where.siteType = category;
    }

    const sites = await db.indexedSite.findMany({
      where,
      orderBy: [
        { communityScore: 'desc' },
        { validationVotes: 'desc' },
        { discoveredAt: 'desc' }
      ],
      take: limit,
      include: {
        tags: true,
        submitter: {
          select: { id: true, primaryHandle: true }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    const feedSites = await this.enrichSitesWithActivity(sites);

    return {
      type: 'favorites',
      title: 'Community Favorites',
      description: 'Sites with the highest community scores and positive reception',
      sites: feedSites,
      metadata: {
        totalCount: await db.indexedSite.count({ where }),
        lastUpdated: new Date(),
        criteria: `Min score: 15, Min votes: 5${category ? `, Category: ${category}` : ''}`
      }
    };
  }

  /**
   * Get hidden gems feed (underappreciated quality sites)
   */
  async getHiddenGemsFeed(
    limit: number = 20,
    category?: string,
    userId?: string
  ): Promise<DiscoveryFeed> {
    // Hidden gems: sites with good quality scores but low discovery/vote counts
    const where: any = {
      communityValidated: true,
      indexingPurpose: { not: 'rejected' }, // Exclude rejected sites
      communityScore: { gte: 8 },   // Decent quality
      validationVotes: { lte: 8 },  // Not many votes yet
      discoveredAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
      }
    };

    if (category && category !== 'all') {
      where.siteType = category;
    }

    // Get sites with low discovery path counts (underexplored)
    const sites = await db.indexedSite.findMany({
      where,
      orderBy: [
        { communityScore: 'desc' },
        { discoveredAt: 'desc' }
      ],
      take: limit * 2, // Get more to filter
      include: {
        tags: true,
        submitter: {
          select: { id: true, primaryHandle: true }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    // Filter for truly "hidden" gems (limited by basic criteria since we can't count discovery paths directly)
    const hiddenGems = sites.slice(0, limit);

    const feedSites = await this.enrichSitesWithActivity(hiddenGems);

    return {
      type: 'hidden_gems',
      title: 'Hidden Gems',
      description: 'Quality sites that deserve more attention from the community',
      sites: feedSites,
      metadata: {
        totalCount: hiddenGems.length,
        lastUpdated: new Date(),
        criteria: `Good scores, low discovery activity${category ? `, Category: ${category}` : ''}`
      }
    };
  }

  /**
   * Get trending sites feed (recent activity spikes)
   */
  async getTrendingFeed(
    limit: number = 20,
    category?: string,
    userId?: string
  ): Promise<DiscoveryFeed> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Get sites with recent activity
    const recentActivity = await db.discoveryPath.groupBy({
      by: ['toSite'],
      where: {
        createdAt: { gte: sevenDaysAgo },
        toSite: { startsWith: 'http' }
      },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } }, // At least 2 recent discoveries
      orderBy: { _count: { id: 'desc' } }
    });

    // Get previous period activity for comparison
    const previousActivity = await db.discoveryPath.groupBy({
      by: ['toSite'],
      where: {
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
      },
      _count: { id: true }
    });

    // Calculate trending scores
    const previousMap = new Map(
      previousActivity.map(p => [p.toSite, p._count.id])
    );

    const trendingSites = recentActivity
      .map(recent => {
        const previous = previousMap.get(recent.toSite) || 0;
        const current = recent._count.id;
        const trendScore = previous > 0 ? (current / previous) : current;

        return {
          url: recent.toSite,
          currentActivity: current,
          previousActivity: previous,
          trendScore
        };
      })
      .filter(t => t.trendScore > 1.5) // 50% increase or new activity
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);

    // Get site details
    const where: any = {
      url: { in: trendingSites.map(t => t.url) },
      communityValidated: true,
      indexingPurpose: { not: 'rejected' } // Exclude rejected sites
    };

    if (category && category !== 'all') {
      where.siteType = category;
    }

    const sites = await db.indexedSite.findMany({
      where,
      include: {
        tags: true,
        submitter: {
          select: { id: true, primaryHandle: true }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    // Sort by trending score
    sites.sort((a, b) => {
      const aTrend = trendingSites.find(t => t.url === a.url)?.trendScore || 0;
      const bTrend = trendingSites.find(t => t.url === b.url)?.trendScore || 0;
      return bTrend - aTrend;
    });

    const feedSites = await this.enrichSitesWithActivity(sites);

    return {
      type: 'trending',
      title: 'Trending Discoveries',
      description: 'Sites experiencing increased discovery activity this week',
      sites: feedSites,
      metadata: {
        totalCount: trendingSites.length,
        lastUpdated: new Date(),
        criteria: `50%+ activity increase vs. previous week${category ? `, Category: ${category}` : ''}`
      }
    };
  }

  /**
   * Get personalized recommendations for a user
   */
  async getUserRecommendationsFeed(
    userId: string,
    limit: number = 20,
    category?: string
  ): Promise<DiscoveryFeed> {
    // Get user's interaction history
    const userVotes = await db.siteVote.findMany({
      where: { userId },
      include: { site: true }
    });

    const userDiscoveries = await db.discoveryPath.findMany({
      where: { discoveredBy: userId },
      take: 50,
      orderBy: { createdAt: 'desc' }
    });

    // Analyze user preferences
    const likedCategories = userVotes
      .filter(v => ['approve', 'quality', 'interesting', 'helpful'].includes(v.voteType))
      .map(v => v.site.siteType)
      .filter(Boolean);

    const categoryPreferences = this.getTopCategories(likedCategories.filter(Boolean) as string[]);

    // Get URLs that user has already discovered
    const discoveredUrls = userDiscoveries.map(d => d.toSite);

    // Get all sites first, then filter out user interactions manually to avoid schema conflicts
    const baseWhere: any = {
      communityValidated: true,
      indexingPurpose: { not: 'rejected' }, // Exclude rejected sites
      // Exclude sites the user has already discovered
      url: {
        notIn: discoveredUrls
      }
    };

    // Only filter by category preferences if we have some
    if (categoryPreferences.length > 0) {
      baseWhere.siteType = { in: categoryPreferences };
    }

    if (category && category !== 'all') {
      baseWhere.siteType = category;
    }

    // Get sites without user vote filtering first
    const allCandidateSites = await db.indexedSite.findMany({
      where: baseWhere,
      include: {
        tags: true,
        submitter: {
          select: { id: true, primaryHandle: true }
        },
        _count: {
          select: { votes: true }
        },
        votes: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    // Filter out sites the user has already voted on
    const sitesUserHasntVotedOn = allCandidateSites.filter(site => site.votes.length === 0);

    // Apply ordering and limit
    const sites = sitesUserHasntVotedOn
      .sort((a, b) => {
        if (b.communityScore !== a.communityScore) {
          return b.communityScore - a.communityScore;
        }
        return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
      })
      .slice(0, limit);

    const feedSites = await this.enrichSitesWithActivity(sites);

    return {
      type: 'user_recommendations',
      title: 'Recommended for You',
      description: 'Sites tailored to your interests and discovery patterns',
      sites: feedSites,
      metadata: {
        totalCount: sitesUserHasntVotedOn.length,
        lastUpdated: new Date(),
        criteria: `Based on ${userVotes.length} votes and ${userDiscoveries.length} discoveries`
      }
    };
  }

  /**
   * Get all available feeds for a user
   */
  async getAllFeeds(
    userId?: string,
    category?: string,
    limit: number = 15
  ): Promise<DiscoveryFeed[]> {
    const feeds = await Promise.all([
      this.getRecentlyFoundFeed(limit, category, userId),
      this.getFavoritesFeed(limit, category, userId),
      this.getHiddenGemsFeed(limit, category, userId),
      this.getTrendingFeed(limit, category, userId)
    ]);

    // Add user recommendations if authenticated
    if (userId) {
      const userFeed = await this.getUserRecommendationsFeed(userId, limit, category);
      feeds.unshift(userFeed); // Put recommendations first
    }

    return feeds;
  }

  /**
   * Enrich sites with recent activity data
   */
  private async enrichSitesWithActivity(sites: any[]): Promise<FeedSite[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return Promise.all(sites.map(async (site) => {
      // Get recent activity counts
      const [recentDiscoveries, recentVotes] = await Promise.all([
        db.discoveryPath.count({
          where: {
            toSite: site.url,
            createdAt: { gte: sevenDaysAgo }
          }
        }),
        db.siteVote.count({
          where: {
            siteId: site.id,
            createdAt: { gte: sevenDaysAgo }
          }
        })
      ]);

      return {
        id: site.id,
        url: site.url,
        title: site.title,
        description: site.description,
        siteType: site.siteType,
        discoveredAt: site.discoveredAt,
        discoveryMethod: site.discoveryMethod,
        communityScore: site.communityScore,
        validationVotes: site.validationVotes,
        tags: site.tags?.map((t: any) => t.tag) || [],
        recentActivity: {
          views: 0, // Would need separate view tracking
          votes: recentVotes,
          discoveries: recentDiscoveries
        },
        discoveredBy: site.submitter ? {
          id: site.submitter.id,
          handle: site.submitter.primaryHandle
        } : undefined
      };
    }));
  }

  /**
   * Get top categories from a list
   */
  private getTopCategories(categories: string[]): string[] {
    const counts = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);
  }
}