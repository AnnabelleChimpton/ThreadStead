/**
 * Community Analytics System
 * Provides insights into discovery patterns, site relationships, and community activity
 */

import { db } from '@/lib/config/database/connection';

export interface AnalyticsMetrics {
  overview: {
    totalSites: number;
    validatedSites: number;
    pendingSites: number;
    totalDiscoveries: number;
    activeUsers: number;
    averageCommunityScore: number;
  };
  discoveryTrends: {
    date: string;
    discoveries: number;
    validations: number;
    newSites: number;
  }[];
  discoveryMethods: {
    method: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'neutral';
  }[];
  topCategories: {
    category: string;
    count: number;
    averageScore: number;
    recentGrowth: number;
  }[];
  userActivity: {
    topValidators: {
      userId: string;
      handle: string;
      validations: number;
      quality: 'high' | 'medium' | 'low';
    }[];
    topDiscoverers: {
      userId: string;
      handle: string;
      discoveries: number;
      successRate: number;
    }[];
  };
  siteHealth: {
    highQuality: number;
    needsImprovement: number;
    problematic: number;
    averageValidationTime: number; // hours
  };
  relationshipInsights: {
    strongConnections: number;
    isolatedSites: number;
    averageConnections: number;
    topConnectors: {
      url: string;
      title: string;
      connections: number;
    }[];
  };
}

export interface TimeSeriesData {
  period: string;
  discoveries: number;
  validations: number;
  newUsers: number;
  activeUsers: number;
}

export class CommunityAnalytics {
  /**
   * Get comprehensive analytics metrics
   */
  async getMetrics(days: number = 30): Promise<AnalyticsMetrics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      overview,
      discoveryTrends,
      discoveryMethods,
      topCategories,
      userActivity,
      siteHealth,
      relationshipInsights
    ] = await Promise.all([
      this.getOverviewMetrics(since),
      this.getDiscoveryTrends(days),
      this.getDiscoveryMethodStats(since),
      this.getTopCategories(since),
      this.getUserActivityStats(since),
      this.getSiteHealthMetrics(),
      this.getRelationshipInsights()
    ]);

    return {
      overview,
      discoveryTrends,
      discoveryMethods,
      topCategories,
      userActivity,
      siteHealth,
      relationshipInsights
    };
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(days: number = 30, granularity: 'day' | 'week' | 'month' = 'day'): Promise<TimeSeriesData[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all discovery paths in the period
    const discoveries = await db.discoveryPath.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, discoveredBy: true }
    });

    // Get all validations (votes) in the period
    const validations = await db.siteVote.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, userId: true }
    });

    // Get new sites in the period
    const newSites = await db.indexedSite.findMany({
      where: {
        discoveredAt: { gte: since },
        indexingPurpose: { not: 'rejected' },
        crawlStatus: { not: 'failed' }
      },
      select: { discoveredAt: true }
    });

    // Group by time period
    const timeMap = new Map<string, {
      discoveries: Set<string>;
      validations: Set<string>;
      newSites: number;
      activeUsers: Set<string>;
    }>();

    const getTimeKey = (date: Date): string => {
      switch (granularity) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'day':
        default:
          return date.toISOString().split('T')[0];
      }
    };

    // Process discoveries
    discoveries.forEach(discovery => {
      const key = getTimeKey(discovery.createdAt);
      if (!timeMap.has(key)) {
        timeMap.set(key, {
          discoveries: new Set(),
          validations: new Set(),
          newSites: 0,
          activeUsers: new Set()
        });
      }
      const data = timeMap.get(key)!;
      data.discoveries.add(discovery.createdAt.toISOString());
      data.activeUsers.add(discovery.discoveredBy);
    });

    // Process validations
    validations.forEach(validation => {
      const key = getTimeKey(validation.createdAt);
      if (!timeMap.has(key)) {
        timeMap.set(key, {
          discoveries: new Set(),
          validations: new Set(),
          newSites: 0,
          activeUsers: new Set()
        });
      }
      const data = timeMap.get(key)!;
      data.validations.add(validation.createdAt.toISOString());
      data.activeUsers.add(validation.userId);
    });

    // Process new sites
    newSites.forEach(site => {
      const key = getTimeKey(site.discoveredAt);
      if (!timeMap.has(key)) {
        timeMap.set(key, {
          discoveries: new Set(),
          validations: new Set(),
          newSites: 0,
          activeUsers: new Set()
        });
      }
      timeMap.get(key)!.newSites++;
    });

    // Convert to time series array
    return Array.from(timeMap.entries())
      .map(([period, data]) => ({
        period,
        discoveries: data.discoveries.size,
        validations: data.validations.size,
        newUsers: 0, // Would need user creation tracking
        activeUsers: data.activeUsers.size
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get discovery quality analysis
   */
  async getDiscoveryQualityMetrics(): Promise<{
    methodQuality: {
      method: string;
      averageScore: number;
      successRate: number;
      totalDiscoveries: number;
    }[];
    userQuality: {
      userId: string;
      handle: string;
      averageScore: number;
      discoveries: number;
      validationRate: number;
    }[];
    categoryQuality: {
      category: string;
      averageScore: number;
      sites: number;
      topPerformers: number;
    }[];
  }> {
    // Method quality analysis
    const methodStats = await db.indexedSite.groupBy({
      by: ['discoveryMethod'],
      where: { communityValidated: true },
      _avg: { communityScore: true },
      _count: { id: true }
    });

    const methodQuality = await Promise.all(
      methodStats.map(async (stat) => {
        const total = await db.indexedSite.count({
          where: { discoveryMethod: stat.discoveryMethod }
        });
        const validated = stat._count.id;

        return {
          method: stat.discoveryMethod,
          averageScore: stat._avg.communityScore || 0,
          successRate: total > 0 ? (validated / total) * 100 : 0,
          totalDiscoveries: total
        };
      })
    );

    // User quality analysis
    const userStats = await db.indexedSite.groupBy({
      by: ['submittedBy'],
      where: {
        submittedBy: { not: null },
        communityValidated: true
      },
      _avg: { communityScore: true },
      _count: { id: true },
      orderBy: { _avg: { communityScore: 'desc' } }
    });

    const userQuality = await Promise.all(
      userStats.slice(0, 20).map(async (stat) => {
        const user = await db.user.findUnique({
          where: { id: stat.submittedBy! },
          select: { primaryHandle: true }
        });

        const totalDiscoveries = await db.indexedSite.count({
          where: { submittedBy: stat.submittedBy! }
        });

        return {
          userId: stat.submittedBy!,
          handle: user?.primaryHandle || 'Unknown',
          averageScore: stat._avg.communityScore || 0,
          discoveries: totalDiscoveries,
          validationRate: totalDiscoveries > 0 ? (stat._count.id / totalDiscoveries) * 100 : 0
        };
      })
    );

    // Category quality analysis
    const categoryStats = await db.indexedSite.groupBy({
      by: ['siteType'],
      where: {
        communityValidated: true,
        siteType: { not: null }
      },
      _avg: { communityScore: true },
      _count: { id: true }
    });

    const categoryQuality = await Promise.all(
      categoryStats.map(async (stat) => {
        const topPerformers = await db.indexedSite.count({
          where: {
            siteType: stat.siteType,
            communityScore: { gte: 25 }
          }
        });

        return {
          category: stat.siteType!,
          averageScore: stat._avg.communityScore || 0,
          sites: stat._count.id,
          topPerformers
        };
      })
    );

    return { methodQuality, userQuality, categoryQuality };
  }

  /**
   * Get community health indicators
   */
  async getCommunityHealth(): Promise<{
    engagement: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      averageSessionLength: number;
    };
    quality: {
      validationBacklog: number;
      averageValidationTime: number;
      consensusRate: number;
      controversialSites: number;
    };
    growth: {
      newSitesPerDay: number;
      discoveryMomentum: 'accelerating' | 'steady' | 'declining';
      userGrowth: number;
      contentDiversity: number;
    };
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Engagement metrics
    const [dailyUsers, weeklyUsers, monthlyUsers] = await Promise.all([
      this.getActiveUsers(oneDayAgo),
      this.getActiveUsers(oneWeekAgo),
      this.getActiveUsers(oneMonthAgo)
    ]);

    // Quality metrics
    const [pendingSites, avgValidationTime, consensusData] = await Promise.all([
      db.indexedSite.count({ where: { communityValidated: false } }),
      this.getAverageValidationTime(),
      this.getConsensusMetrics()
    ]);

    // Growth metrics
    const [recentSites, previousSites, categoryCount] = await Promise.all([
      db.indexedSite.count({ where: { discoveredAt: { gte: oneWeekAgo } } }),
      db.indexedSite.count({
        where: {
          discoveredAt: {
            gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
            lt: oneWeekAgo
          }
        }
      }),
      db.indexedSite.findMany({
        where: { siteType: { not: null } },
        select: { siteType: true },
        distinct: ['siteType']
      })
    ]);

    const newSitesPerDay = recentSites / 7;
    const previousSitesPerDay = previousSites / 7;

    let discoveryMomentum: 'accelerating' | 'steady' | 'declining' = 'steady';
    if (newSitesPerDay > previousSitesPerDay * 1.1) {
      discoveryMomentum = 'accelerating';
    } else if (newSitesPerDay < previousSitesPerDay * 0.9) {
      discoveryMomentum = 'declining';
    }

    return {
      engagement: {
        dailyActiveUsers: dailyUsers,
        weeklyActiveUsers: weeklyUsers,
        monthlyActiveUsers: monthlyUsers,
        averageSessionLength: 0 // Would need session tracking
      },
      quality: {
        validationBacklog: pendingSites,
        averageValidationTime: avgValidationTime,
        consensusRate: consensusData.consensusRate,
        controversialSites: consensusData.controversialSites
      },
      growth: {
        newSitesPerDay,
        discoveryMomentum,
        userGrowth: 0, // Would need user creation tracking
        contentDiversity: categoryCount.length
      }
    };
  }

  // Private helper methods

  private async getOverviewMetrics(since: Date) {
    const [totalSites, validatedSites, pendingSites, discoveries, activeUsers, avgScore] = await Promise.all([
      db.indexedSite.count({
        where: {
          indexingPurpose: { not: 'rejected' },
          crawlStatus: { not: 'failed' }
        }
      }),
      db.indexedSite.count({
        where: {
          communityValidated: true,
          indexingPurpose: { not: 'rejected' },
          crawlStatus: { not: 'failed' }
        }
      }),
      db.indexedSite.count({
        where: {
          communityValidated: false,
          indexingPurpose: { not: 'rejected' },
          crawlStatus: { not: 'failed' }
        }
      }),
      db.discoveryPath.count({ where: { createdAt: { gte: since } } }),
      this.getActiveUsers(since),
      db.indexedSite.aggregate({
        _avg: { communityScore: true },
        where: {
          communityValidated: true,
          indexingPurpose: { not: 'rejected' },
          crawlStatus: { not: 'failed' }
        }
      })
    ]);

    return {
      totalSites,
      validatedSites,
      pendingSites,
      totalDiscoveries: discoveries,
      activeUsers,
      averageCommunityScore: avgScore._avg.communityScore || 0
    };
  }

  private async getDiscoveryTrends(days: number) {
    // Simplified version - would use proper date grouping in production
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const [discoveries, validations, newSites] = await Promise.all([
        db.discoveryPath.count({
          where: {
            createdAt: { gte: date, lt: nextDate }
          }
        }),
        db.siteVote.count({
          where: {
            createdAt: { gte: date, lt: nextDate }
          }
        }),
        db.indexedSite.count({
          where: {
            discoveredAt: { gte: date, lt: nextDate },
            indexingPurpose: { not: 'rejected' },
            crawlStatus: { not: 'failed' }
          }
        })
      ]);

      trends.push({
        date: date.toISOString().split('T')[0],
        discoveries,
        validations,
        newSites
      });
    }
    return trends;
  }

  private async getDiscoveryMethodStats(since: Date) {
    const stats = await db.discoveryPath.groupBy({
      by: ['discoveryMethod'],
      where: { createdAt: { gte: since } },
      _count: { discoveryMethod: true }
    });

    const total = stats.reduce((sum, stat) => sum + stat._count.discoveryMethod, 0);

    return stats.map(stat => ({
      method: stat.discoveryMethod,
      count: stat._count.discoveryMethod,
      percentage: total > 0 ? (stat._count.discoveryMethod / total) * 100 : 0,
      trend: 'neutral' as const // Would need historical data for trends
    }));
  }

  private async getTopCategories(since: Date) {
    const categories = await db.indexedSite.groupBy({
      by: ['siteType'],
      where: {
        siteType: { not: null },
        communityValidated: true
      },
      _count: { siteType: true },
      _avg: { communityScore: true }
    });

    return categories.map(cat => ({
      category: cat.siteType!,
      count: cat._count.siteType,
      averageScore: cat._avg.communityScore || 0,
      recentGrowth: 0 // Would need historical comparison
    }));
  }

  private async getUserActivityStats(since: Date) {
    // Top validators
    const validators = await db.siteVote.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10
    });

    const topValidators = await Promise.all(
      validators.map(async (v) => {
        const user = await db.user.findUnique({
          where: { id: v.userId },
          select: { primaryHandle: true }
        });

        return {
          userId: v.userId,
          handle: user?.primaryHandle || 'Unknown',
          validations: v._count.userId,
          quality: 'medium' as const // Would need quality analysis
        };
      })
    );

    // Top discoverers (based on site submissions)
    const discoverers = await db.indexedSite.groupBy({
      by: ['submittedBy'],
      where: {
        submittedBy: { not: null },
        discoveredAt: { gte: since }
      },
      _count: { submittedBy: true },
      orderBy: { _count: { submittedBy: 'desc' } },
      take: 10
    });

    const topDiscoverers = await Promise.all(
      discoverers.map(async (d) => {
        const user = await db.user.findUnique({
          where: { id: d.submittedBy! },
          select: { primaryHandle: true }
        });

        const validated = await db.indexedSite.count({
          where: {
            submittedBy: d.submittedBy!,
            communityValidated: true
          }
        });

        return {
          userId: d.submittedBy!,
          handle: user?.primaryHandle || 'Unknown',
          discoveries: d._count.submittedBy,
          successRate: d._count.submittedBy > 0 ? (validated / d._count.submittedBy) * 100 : 0
        };
      })
    );

    return { topValidators, topDiscoverers };
  }

  private async getSiteHealthMetrics() {
    const [high, medium, low, avgTime] = await Promise.all([
      db.indexedSite.count({ where: { communityScore: { gte: 25 } } }),
      db.indexedSite.count({ where: { communityScore: { gte: 10, lt: 25 } } }),
      db.indexedSite.count({ where: { communityScore: { lt: 10 } } }),
      this.getAverageValidationTime()
    ]);

    return {
      highQuality: high,
      needsImprovement: medium,
      problematic: low,
      averageValidationTime: avgTime
    };
  }

  private async getRelationshipInsights() {
    const [totalRelationships, sites, strongConnections] = await Promise.all([
      db.siteRelationship.count(),
      db.indexedSite.count({ where: { communityValidated: true } }),
      db.siteRelationship.count({ where: { strength: { gte: 10 } } })
    ]);

    const topConnectors = await db.siteRelationship.groupBy({
      by: ['siteA'],
      _count: { siteA: true },
      orderBy: { _count: { siteA: 'desc' } },
      take: 5
    });

    const connectorDetails = await Promise.all(
      topConnectors.map(async (conn) => {
        const site = await db.indexedSite.findUnique({
          where: { url: conn.siteA },
          select: { url: true, title: true }
        });

        return {
          url: conn.siteA,
          title: site?.title || new URL(conn.siteA).hostname,
          connections: conn._count.siteA
        };
      })
    );

    return {
      strongConnections,
      isolatedSites: sites - totalRelationships, // Simplified calculation
      averageConnections: sites > 0 ? totalRelationships / sites : 0,
      topConnectors: connectorDetails
    };
  }

  private async getActiveUsers(since: Date): Promise<number> {
    const [votersCount, discoverersCount] = await Promise.all([
      db.siteVote.findMany({
        where: { createdAt: { gte: since } },
        select: { userId: true },
        distinct: ['userId']
      }),
      db.discoveryPath.findMany({
        where: { createdAt: { gte: since } },
        select: { discoveredBy: true },
        distinct: ['discoveredBy']
      })
    ]);

    const activeUsers = new Set([
      ...votersCount.map(v => v.userId),
      ...discoverersCount.map(d => d.discoveredBy)
    ]);

    return activeUsers.size;
  }

  private async getAverageValidationTime(): Promise<number> {
    // Simplified - would need more complex logic to track validation time
    return 24; // Default 24 hours
  }

  private async getConsensusMetrics(): Promise<{ consensusRate: number; controversialSites: number }> {
    const sitesWithVotes = await db.indexedSite.findMany({
      where: { validationVotes: { gte: 3 } },
      include: { votes: true }
    });

    let consensusCount = 0;
    let controversialCount = 0;

    sitesWithVotes.forEach(site => {
      const positiveVotes = site.votes.filter(v =>
        ['approve', 'quality', 'interesting', 'helpful'].includes(v.voteType)
      ).length;

      const negativeVotes = site.votes.filter(v =>
        ['reject', 'broken', 'spam', 'outdated'].includes(v.voteType)
      ).length;

      const totalVotes = positiveVotes + negativeVotes;
      if (totalVotes > 0) {
        const agreement = Math.max(positiveVotes, negativeVotes) / totalVotes;
        if (agreement >= 0.7) {
          consensusCount++;
        } else if (agreement <= 0.6) {
          controversialCount++;
        }
      }
    });

    return {
      consensusRate: sitesWithVotes.length > 0 ? (consensusCount / sitesWithVotes.length) * 100 : 0,
      controversialSites: controversialCount
    };
  }
}