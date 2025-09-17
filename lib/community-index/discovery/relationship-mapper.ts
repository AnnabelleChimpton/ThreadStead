/**
 * Site Relationship Mapping System
 * Analyzes discovery patterns to build intelligent site relationships
 */

import { db } from '@/lib/config/database/connection';

export interface SiteRelationshipData {
  siteA: string;
  siteB: string;
  relationshipType: string;
  strength: number;
  discoveredBy: string[];
}

export interface RelationshipInsight {
  site: string;
  relatedSites: Array<{
    url: string;
    title?: string;
    relationshipType: string;
    strength: number;
    sharedUsers: number;
    discoveryMethods: string[];
    recentActivity: number;
  }>;
  categories: string[];
  popularPaths: Array<{
    fromSite: string;
    method: string;
    frequency: number;
  }>;
}

export class SiteRelationshipMapper {
  /**
   * Build relationships from discovery path data
   */
  async buildRelationships(lookbackDays: number = 30): Promise<void> {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    // Get all discovery paths in the time period
    const discoveryPaths = await db.discoveryPath.findMany({
      where: {
        createdAt: { gte: since },
        fromSite: {
          not: null,
          startsWith: 'http'
        }
      },
      include: {
        // Get user info for relationship weighting
        discoverer: {
          select: { id: true, createdAt: true }
        }
      }
    });

    // Group paths by site pairs
    const relationshipMap = new Map<string, {
      paths: typeof discoveryPaths;
      users: Set<string>;
      methods: Set<string>;
    }>();

    for (const path of discoveryPaths) {
      if (!path.fromSite) continue;

      const pairKey = this.getSitePairKey(path.fromSite, path.toSite);

      if (!relationshipMap.has(pairKey)) {
        relationshipMap.set(pairKey, {
          paths: [],
          users: new Set(),
          methods: new Set()
        });
      }

      const relationship = relationshipMap.get(pairKey)!;
      relationship.paths.push(path);
      relationship.users.add(path.discoveredBy);
      relationship.methods.add(path.discoveryMethod);
    }

    // Create or update relationships
    for (const [pairKey, data] of relationshipMap) {
      const [siteA, siteB] = pairKey.split('|');

      const strength = this.calculateRelationshipStrength(data);
      const relationshipType = this.determineRelationshipType(data);

      await this.upsertRelationship({
        siteA,
        siteB,
        relationshipType,
        strength,
        discoveredBy: Array.from(data.users)
      });
    }
  }

  /**
   * Get relationship insights for a specific site
   */
  async getSiteRelationships(siteUrl: string, limit: number = 20): Promise<RelationshipInsight> {
    // Get direct relationships
    const relationships = await db.siteRelationship.findMany({
      where: {
        OR: [
          { siteA: siteUrl },
          { siteB: siteUrl }
        ]
      },
      orderBy: { strength: 'desc' },
      take: limit
    });

    // Get related site details
    const relatedSiteUrls = relationships.map(r =>
      r.siteA === siteUrl ? r.siteB : r.siteA
    );

    const relatedSites = await db.indexedSite.findMany({
      where: { url: { in: relatedSiteUrls } },
      select: { url: true, title: true, siteType: true }
    });

    // Get discovery patterns for this site
    const discoveryPaths = await db.discoveryPath.findMany({
      where: {
        OR: [
          { fromSite: siteUrl },
          { toSite: siteUrl }
        ],
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      include: {
        discoverer: { select: { id: true } }
      }
    });

    // Build relationship data
    const relatedSiteData = relationships.map(rel => {
      const relatedUrl = rel.siteA === siteUrl ? rel.siteB : rel.siteA;
      const siteInfo = relatedSites.find(s => s.url === relatedUrl);

      const pathsToSite = discoveryPaths.filter(p =>
        (p.fromSite === siteUrl && p.toSite === relatedUrl) ||
        (p.toSite === siteUrl && p.fromSite === relatedUrl)
      );

      return {
        url: relatedUrl,
        title: siteInfo?.title,
        relationshipType: rel.relationshipType,
        strength: rel.strength,
        sharedUsers: rel.discoveredBy.length,
        discoveryMethods: Array.from(new Set(pathsToSite.map(p => p.discoveryMethod))),
        recentActivity: pathsToSite.length
      };
    });

    // Analyze popular paths
    const inboundPaths = discoveryPaths
      .filter(p => p.toSite === siteUrl && p.fromSite)
      .reduce((acc, path) => {
        const key = `${path.fromSite}|${path.discoveryMethod}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const popularPaths = Object.entries(inboundPaths)
      .map(([key, frequency]) => {
        const [fromSite, method] = key.split('|');
        return { fromSite, method, frequency };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Get site categories
    const currentSite = await db.indexedSite.findUnique({
      where: { url: siteUrl },
      select: { siteType: true }
    });

    const categories = [
      ...(currentSite?.siteType ? [currentSite.siteType] : []),
      ...Array.from(new Set(relatedSites.map(s => s.siteType).filter(Boolean) as string[]))
    ];

    return {
      site: siteUrl,
      relatedSites: relatedSiteData,
      categories,
      popularPaths
    };
  }

  /**
   * Find sites similar to a given site
   */
  async findSimilarSites(siteUrl: string, limit: number = 10): Promise<Array<{
    url: string;
    title?: string;
    similarity: number;
    reasons: string[];
  }>> {
    // Get the target site's relationships and characteristics
    const targetRelationships = await this.getSiteRelationships(siteUrl);

    // Get all other sites with relationships
    const allRelationships = await db.siteRelationship.findMany();

    // Calculate similarity scores
    const similarityScores = new Map<string, {
      score: number;
      reasons: string[];
      site: { url: string; title?: string; };
    }>();

    for (const rel of allRelationships) {
      const siteA = rel.siteA;
      const siteB = rel.siteB;

      if (siteA === siteUrl || siteB === siteUrl) continue;

      // Check both sites in the relationship
      for (const candidateSite of [siteA, siteB]) {
        if (!candidateSite || candidateSite === siteUrl) continue;

        const existing = similarityScores.get(candidateSite);
        const current = existing || { score: 0, reasons: [], site: { url: candidateSite } };

        // Add similarity based on shared relationships
        const sharedConnections = targetRelationships.relatedSites.filter(r =>
          allRelationships.some(ar =>
            (ar.siteA === candidateSite && ar.siteB === r.url) ||
            (ar.siteB === candidateSite && ar.siteA === r.url)
          )
        );

        if (sharedConnections.length > 0) {
          current.score += sharedConnections.length * 10;
          current.reasons.push(`${sharedConnections.length} shared connections`);
        }

        similarityScores.set(candidateSite, current);
      }
    }

    // Return top similar sites
    return Array.from(similarityScores.entries())
      .map(([url, data]) => ({
        url,
        title: data.site.title,
        similarity: data.score,
        reasons: data.reasons
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get trending discovery patterns
   */
  async getTrendingPatterns(days: number = 7): Promise<Array<{
    pattern: string;
    frequency: number;
    trend: 'up' | 'down' | 'stable';
    involvedSites: string[];
  }>> {
    const now = new Date();
    const currentPeriod = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriod = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    // Get current period patterns
    const currentPaths = await db.discoveryPath.findMany({
      where: { createdAt: { gte: currentPeriod } }
    });

    // Get previous period patterns
    const previousPaths = await db.discoveryPath.findMany({
      where: {
        createdAt: {
          gte: previousPeriod,
          lt: currentPeriod
        }
      }
    });

    // Analyze patterns
    const currentPatterns = this.analyzePathPatterns(currentPaths);
    const previousPatterns = this.analyzePathPatterns(previousPaths);

    // Calculate trends
    return Object.entries(currentPatterns).map(([pattern, data]) => {
      const previousData = previousPatterns[pattern];
      const previousFreq = previousData?.frequency || 0;
      const currentFreq = data.frequency;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (currentFreq > previousFreq * 1.2) trend = 'up';
      else if (currentFreq < previousFreq * 0.8) trend = 'down';

      return {
        pattern,
        frequency: currentFreq,
        trend,
        involvedSites: data.sites
      };
    }).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Calculate relationship strength based on discovery patterns
   */
  private calculateRelationshipStrength(data: {
    paths: any[];
    users: Set<string>;
    methods: Set<string>;
  }): number {
    let strength = 0;

    // Base score from path frequency
    strength += data.paths.length;

    // Bonus for multiple unique users
    strength += data.users.size * 2;

    // Bonus for diverse discovery methods
    strength += data.methods.size * 3;

    // Bonus for recent activity
    const recentPaths = data.paths.filter(p =>
      Date.now() - p.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000
    );
    strength += recentPaths.length * 1.5;

    return Math.round(strength);
  }

  /**
   * Determine relationship type based on discovery patterns
   */
  private determineRelationshipType(data: {
    methods: Set<string>;
    paths: any[];
  }): string {
    const methods = Array.from(data.methods);

    if (methods.includes('webring')) return 'webring_member';
    if (methods.includes('recommendation')) return 'recommended';
    if (methods.some(m => m.includes('search'))) return 'topically_related';
    if (data.paths.length > 10) return 'frequently_linked';

    return 'discovered_together';
  }

  /**
   * Create a consistent key for site pairs
   */
  private getSitePairKey(siteA: string, siteB: string): string {
    return siteA < siteB ? `${siteA}|${siteB}` : `${siteB}|${siteA}`;
  }

  /**
   * Upsert a site relationship
   */
  private async upsertRelationship(data: SiteRelationshipData): Promise<void> {
    const existing = await db.siteRelationship.findFirst({
      where: {
        OR: [
          { siteA: data.siteA, siteB: data.siteB },
          { siteA: data.siteB, siteB: data.siteA }
        ]
      }
    });

    if (existing) {
      await db.siteRelationship.update({
        where: { id: existing.id },
        data: {
          strength: data.strength,
          discoveredBy: data.discoveredBy
        }
      });
    } else {
      await db.siteRelationship.create({
        data
      });
    }
  }

  /**
   * Analyze path patterns for trending analysis
   */
  private analyzePathPatterns(paths: any[]): Record<string, { frequency: number; sites: string[] }> {
    const patterns: Record<string, { frequency: number; sites: string[] }> = {};

    for (const path of paths) {
      const pattern = `${path.discoveryMethod}:${path.fromSite ? 'site_to_site' : 'direct'}`;

      if (!patterns[pattern]) {
        patterns[pattern] = { frequency: 0, sites: [] };
      }

      patterns[pattern].frequency++;

      if (path.fromSite && !patterns[pattern].sites.includes(path.fromSite)) {
        patterns[pattern].sites.push(path.fromSite);
      }
      if (!patterns[pattern].sites.includes(path.toSite)) {
        patterns[pattern].sites.push(path.toSite);
      }
    }

    return patterns;
  }
}