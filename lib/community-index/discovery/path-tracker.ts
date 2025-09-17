/**
 * Discovery Path Tracking System
 * Tracks how users navigate between sites to build understanding of relationships
 */

import { db } from '@/lib/config/database/connection';

export interface DiscoveryEvent {
  fromSite?: string;     // URL or special values like "search", "surprise", "home"
  toSite: string;        // URL from IndexedSite
  discoveredBy: string;  // User ID
  discoveryMethod: string; // link_click, search_result, webring, random, surprise, validation
  sessionId?: string;    // Optional session tracking
  metadata?: Record<string, any>; // Additional context
}

export class DiscoveryPathTracker {
  /**
   * Track a discovery event when user navigates to an indexed site
   */
  async trackDiscovery(event: DiscoveryEvent): Promise<void> {
    try {
      // Validate that the destination site exists in our index
      const indexedSite = await db.indexedSite.findUnique({
        where: { url: event.toSite },
        select: { id: true }
      });

      if (!indexedSite) {
        // Site not in our index, don't track
        return;
      }

      // Create discovery path record
      await db.discoveryPath.create({
        data: {
          fromSite: event.fromSite || null,
          toSite: event.toSite,
          discoveredBy: event.discoveredBy,
          discoveryMethod: event.discoveryMethod,
          sessionId: event.sessionId || null
        }
      });

      // Update site relationship data if this is a site-to-site navigation
      if (event.fromSite && event.fromSite.startsWith('http')) {
        await this.updateSiteRelationship(event.fromSite, event.toSite, event.discoveryMethod);
      }

    } catch (error) {
      console.error('Failed to track discovery path:', error);
      // Don't throw - tracking failures shouldn't break user experience
    }
  }

  /**
   * Track multiple discoveries in a session (batch operation)
   */
  async trackDiscoverySession(events: DiscoveryEvent[]): Promise<void> {
    const sessionId = this.generateSessionId();

    for (const event of events) {
      await this.trackDiscovery({
        ...event,
        sessionId: event.sessionId || sessionId
      });
    }
  }

  /**
   * Get discovery patterns for a specific site
   */
  async getSiteDiscoveryPatterns(siteUrl: string, limit: number = 50): Promise<{
    inbound: Array<{
      fromSite: string | null;
      method: string;
      count: number;
      recentCount: number; // Last 30 days
    }>;
    outbound: Array<{
      toSite: string;
      method: string;
      count: number;
      recentCount: number;
    }>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get inbound discovery paths (how people find this site)
    const inboundPaths = await db.discoveryPath.groupBy({
      by: ['fromSite', 'discoveryMethod'],
      where: { toSite: siteUrl },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    const inboundWithRecent = await Promise.all(
      inboundPaths.map(async (path) => {
        const recentCount = await db.discoveryPath.count({
          where: {
            toSite: siteUrl,
            fromSite: path.fromSite,
            discoveryMethod: path.discoveryMethod,
            createdAt: { gte: thirtyDaysAgo }
          }
        });

        return {
          fromSite: path.fromSite,
          method: path.discoveryMethod,
          count: path._count.id,
          recentCount
        };
      })
    );

    // Get outbound discovery paths (where people go from this site)
    const outboundPaths = await db.discoveryPath.groupBy({
      by: ['toSite', 'discoveryMethod'],
      where: { fromSite: siteUrl },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    const outboundWithRecent = await Promise.all(
      outboundPaths.map(async (path) => {
        const recentCount = await db.discoveryPath.count({
          where: {
            fromSite: siteUrl,
            toSite: path.toSite,
            discoveryMethod: path.discoveryMethod,
            createdAt: { gte: thirtyDaysAgo }
          }
        });

        return {
          toSite: path.toSite,
          method: path.discoveryMethod,
          count: path._count.id,
          recentCount
        };
      })
    );

    return {
      inbound: inboundWithRecent,
      outbound: outboundWithRecent
    };
  }

  /**
   * Get popular discovery methods across the platform
   */
  async getDiscoveryMethodStats(days: number = 30): Promise<Array<{
    method: string;
    count: number;
    uniqueUsers: number;
    uniqueSites: number;
  }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const methodStats = await db.discoveryPath.groupBy({
      by: ['discoveryMethod'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    return Promise.all(
      methodStats.map(async (stat) => {
        const [uniqueUsers, uniqueSites] = await Promise.all([
          db.discoveryPath.findMany({
            where: {
              discoveryMethod: stat.discoveryMethod,
              createdAt: { gte: since }
            },
            select: { discoveredBy: true },
            distinct: ['discoveredBy']
          }),
          db.discoveryPath.findMany({
            where: {
              discoveryMethod: stat.discoveryMethod,
              createdAt: { gte: since }
            },
            select: { toSite: true },
            distinct: ['toSite']
          })
        ]);

        return {
          method: stat.discoveryMethod,
          count: stat._count.id,
          uniqueUsers: uniqueUsers.length,
          uniqueSites: uniqueSites.length
        };
      })
    );
  }

  /**
   * Update site relationship strength based on discovery patterns
   */
  private async updateSiteRelationship(
    fromSite: string,
    toSite: string,
    discoveryMethod: string
  ): Promise<void> {
    try {
      // Check if relationship already exists
      const existing = await db.siteRelationship.findFirst({
        where: {
          OR: [
            { siteA: fromSite, siteB: toSite },
            { siteA: toSite, siteB: fromSite }
          ],
          relationshipType: 'links_to'
        }
      });

      if (existing) {
        // Update existing relationship strength
        await db.siteRelationship.update({
          where: { id: existing.id },
          data: {
            strength: { increment: 1 },
            discoveredBy: {
              push: [] // We'd need the user ID here
            }
          }
        });
      } else {
        // Create new relationship
        await db.siteRelationship.create({
          data: {
            siteA: fromSite,
            siteB: toSite,
            relationshipType: 'links_to',
            strength: 1,
            discoveredBy: [] // We'd need the user ID here
          }
        });
      }
    } catch (error) {
      console.error('Failed to update site relationship:', error);
    }
  }

  /**
   * Generate a unique session ID for tracking discovery sessions
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get discovery trends over time
   */
  async getDiscoveryTrends(days: number = 30): Promise<Array<{
    date: string;
    discoveries: number;
    uniqueUsers: number;
    uniqueSites: number;
  }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This would need a more complex query to group by date
    // For now, return a simple aggregation
    const discoveries = await db.discoveryPath.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        discoveredBy: true,
        toSite: true
      }
    });

    // Group by date (simplified version)
    const trendMap = new Map<string, {
      discoveries: number;
      users: Set<string>;
      sites: Set<string>;
    }>();

    discoveries.forEach(discovery => {
      const dateKey = discovery.createdAt.toISOString().split('T')[0];

      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          discoveries: 0,
          users: new Set(),
          sites: new Set()
        });
      }

      const dayData = trendMap.get(dateKey)!;
      dayData.discoveries++;
      dayData.users.add(discovery.discoveredBy);
      dayData.sites.add(discovery.toSite);
    });

    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      discoveries: data.discoveries,
      uniqueUsers: data.users.size,
      uniqueSites: data.sites.size
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
}