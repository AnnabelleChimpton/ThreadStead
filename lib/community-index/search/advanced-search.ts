/**
 * Advanced Search System for Community Index
 * Provides faceted search with multiple filter dimensions
 */

import { db } from '@/lib/config/database/connection';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  tags?: string[];
  discoveryMethods?: string[];
  communityScoreRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  validationStatus?: 'validated' | 'pending' | 'all';
  sortBy?: 'relevance' | 'score' | 'recent' | 'alphabetical' | 'activity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  description?: string;
  siteType?: string;
  communityScore: number;
  validationVotes: number;
  discoveredAt: Date;
  discoveryMethod: string;
  communityValidated: boolean | null;
  tags: string[];
  discoveredBy?: {
    id: string;
    handle: string;
  };
  recentActivity: {
    discoveries: number;
    votes: number;
  };
  matchScore?: number; // Relevance score for text search
}

export interface SearchResponse {
  results: SearchResult[];
  facets: {
    categories: { value: string; count: number; label: string }[];
    tags: { value: string; count: number }[];
    discoveryMethods: { value: string; count: number; label: string }[];
    scoreRanges: { range: string; count: number }[];
    validationStatus: { status: string; count: number; label: string }[];
  };
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  searchMeta: {
    query?: string;
    executionTime: number;
    filters: SearchFilters;
  };
}

export class AdvancedSearchEngine {
  /**
   * Perform advanced search with faceted filtering
   */
  async search(filters: SearchFilters): Promise<SearchResponse> {
    const startTime = Date.now();
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Build where clause
    const where = this.buildWhereClause(filters);

    // Build order clause
    const orderBy = this.buildOrderClause(filters);

    // Execute search and facet queries in parallel
    const [results, facets, total] = await Promise.all([
      this.executeSearch(where, orderBy, limit, offset, filters.query),
      this.generateFacets(filters),
      this.getSearchCount(where)
    ]);

    return {
      results,
      facets,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      },
      searchMeta: {
        query: filters.query,
        executionTime: Date.now() - startTime,
        filters
      }
    };
  }

  /**
   * Get search suggestions and autocomplete
   */
  async getSuggestions(query: string, limit: number = 10): Promise<{
    sites: { url: string; title: string; type: 'site' }[];
    tags: { name: string; count: number; type: 'tag' }[];
    categories: { name: string; count: number; type: 'category' }[];
  }> {
    if (!query || query.length < 2) {
      return { sites: [], tags: [], categories: [] };
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    const [sites, tags, categories] = await Promise.all([
      // Site suggestions
      db.indexedSite.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { url: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ],
          communityValidated: true
        },
        select: { url: true, title: true },
        take: limit
      }),

      // Tag suggestions
      db.siteTag.groupBy({
        by: ['tag'],
        where: {
          tag: { contains: query, mode: 'insensitive' }
        },
        _count: { tag: true },
        orderBy: { _count: { tag: 'desc' } },
        take: limit
      }).then(tagGroups =>
        tagGroups.map(group => ({
          name: group.tag,
          count: group._count.tag,
          type: 'tag' as const
        }))
      ),

      // Category suggestions
      db.indexedSite.groupBy({
        by: ['siteType'],
        where: {
          siteType: { contains: query, mode: 'insensitive' },
          communityValidated: true
        },
        _count: { siteType: true }
      }).then(groups =>
        groups.map(g => ({
          name: g.siteType || '',
          count: g._count.siteType,
          type: 'category' as const
        })).filter(c => c.name)
      )
    ]);

    return {
      sites: sites.map(s => ({ ...s, type: 'site' as const })),
      tags,
      categories
    };
  }

  /**
   * Get popular search terms and trending searches
   */
  async getPopularSearches(): Promise<{
    popularTags: { name: string; count: number }[];
    popularCategories: { name: string; count: number }[];
    recentlyActive: { url: string; title: string; activity: number }[];
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [popularTags, popularCategories, recentlyActive] = await Promise.all([
      // Most used tags
      db.siteTag.groupBy({
        by: ['tag'],
        _count: { tag: true },
        orderBy: { _count: { tag: 'desc' } },
        take: 20
      }).then(groups =>
        groups.map(g => ({
          name: g.tag,
          count: g._count.tag
        }))
      ),

      // Most common categories
      db.indexedSite.groupBy({
        by: ['siteType'],
        where: {
          communityValidated: true,
          siteType: { not: null }
        },
        _count: { siteType: true },
        orderBy: { _count: { siteType: 'desc' } }
      }).then(groups =>
        groups.map(g => ({
          name: g.siteType || '',
          count: g._count.siteType
        })).filter(c => c.name)
      ),

      // Recently active sites
      db.discoveryPath.groupBy({
        by: ['toSite'],
        where: {
          createdAt: { gte: sevenDaysAgo },
          toSite: { startsWith: 'http' }
        },
        _count: { toSite: true },
        orderBy: { _count: { toSite: 'desc' } },
        take: 10
      }).then(async (groups) => {
        const siteUrls = groups.map(g => g.toSite);
        const sites = await db.indexedSite.findMany({
          where: { url: { in: siteUrls } },
          select: { url: true, title: true }
        });

        return groups.map(g => {
          const site = sites.find(s => s.url === g.toSite);
          return {
            url: g.toSite,
            title: site?.title || new URL(g.toSite).hostname,
            activity: g._count.toSite
          };
        });
      })
    ]);

    return { popularTags, popularCategories, recentlyActive };
  }

  /**
   * Build Prisma where clause from search filters
   */
  private buildWhereClause(filters: SearchFilters): any {
    const where: any = {};

    // Validation status filter
    if (filters.validationStatus === 'validated') {
      where.communityValidated = true;
    } else if (filters.validationStatus === 'pending') {
      where.communityValidated = false;
    }
    // 'all' means no filter

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      where.siteType = { in: filters.categories };
    }

    // Community score range
    if (filters.communityScoreRange) {
      where.communityScore = {
        gte: filters.communityScoreRange.min,
        lte: filters.communityScoreRange.max
      };
    }

    // Date range
    if (filters.dateRange) {
      where.discoveredAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    // Discovery methods
    if (filters.discoveryMethods && filters.discoveryMethods.length > 0) {
      where.discoveryMethod = { in: filters.discoveryMethods };
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          tag: { in: filters.tags }
        }
      };
    }

    // Text search (will be handled separately in executeSearch)

    return where;
  }

  /**
   * Build Prisma order clause from search filters
   */
  private buildOrderClause(filters: SearchFilters): any[] {
    const { sortBy = 'relevance', sortOrder = 'desc' } = filters;

    switch (sortBy) {
      case 'score':
        return [{ communityScore: sortOrder }];

      case 'recent':
        return [{ discoveredAt: sortOrder }];

      case 'alphabetical':
        return [{ title: sortOrder }];

      case 'activity':
        // For activity, we'll need to handle this with a subquery or separate logic
        return [{ communityScore: 'desc' }, { discoveredAt: 'desc' }];

      case 'relevance':
      default:
        // For text search relevance, this will be handled in executeSearch
        return [{ communityScore: 'desc' }, { discoveredAt: 'desc' }];
    }
  }

  /**
   * Execute the search query with text search support
   */
  private async executeSearch(
    where: any,
    orderBy: any[],
    limit: number,
    offset: number,
    query?: string
  ): Promise<SearchResult[]> {
    const include = {
      tags: true,
      submitter: {
        select: { id: true, primaryHandle: true }
      },
      _count: {
        select: { votes: true }
      }
    };

    let sites: any[];

    if (query && query.trim()) {
      // Text search with relevance scoring
      const searchTerm = query.trim();

      // Use full-text search or LIKE queries
      sites = await db.indexedSite.findMany({
        where: {
          ...where,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { url: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { some: { tag: { contains: searchTerm, mode: 'insensitive' } } } }
          ]
        },
        include,
        skip: offset,
        take: limit,
        orderBy
      });

      // Add relevance scoring
      sites = sites.map(site => {
        let matchScore = 0;
        const lowerQuery = searchTerm.toLowerCase();
        const lowerTitle = (site.title || '').toLowerCase();
        const lowerDesc = (site.description || '').toLowerCase();
        const lowerUrl = site.url.toLowerCase();

        // Title matches get highest score
        if (lowerTitle.includes(lowerQuery)) {
          matchScore += 100;
          if (lowerTitle.startsWith(lowerQuery)) matchScore += 50;
        }

        // Description matches
        if (lowerDesc.includes(lowerQuery)) {
          matchScore += 30;
        }

        // URL matches
        if (lowerUrl.includes(lowerQuery)) {
          matchScore += 20;
        }

        // Tag matches (high priority since they're curated)
        const tags = site.tags || [];
        const matchingTags = tags.filter((t: any) =>
          t.tag.toLowerCase().includes(lowerQuery)
        );
        if (matchingTags.length > 0) {
          matchScore += 80; // High priority for tag matches
          // Exact tag matches get bonus
          if (matchingTags.some((t: any) => t.tag.toLowerCase() === lowerQuery)) {
            matchScore += 40;
          }
        }

        return { ...site, matchScore };
      });

      // Sort by relevance if requested
      if (orderBy.length === 0 || orderBy[0].communityScore) {
        sites.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      }
    } else {
      // No text search
      sites = await db.indexedSite.findMany({
        where,
        include,
        skip: offset,
        take: limit,
        orderBy
      });
    }

    // Get recent activity for each site
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const siteUrls = sites.map(s => s.url);

    const recentActivity = await db.discoveryPath.groupBy({
      by: ['toSite'],
      where: {
        toSite: { in: siteUrls },
        createdAt: { gte: sevenDaysAgo }
      },
      _count: { toSite: true }
    });

    const activityMap = new Map(
      recentActivity.map(a => [a.toSite, a._count.toSite])
    );

    // Transform to search results
    return sites.map(site => ({
      id: site.id,
      url: site.url,
      title: site.title,
      description: site.description,
      siteType: site.siteType,
      communityScore: site.communityScore,
      validationVotes: site.validationVotes,
      discoveredAt: site.discoveredAt,
      discoveryMethod: site.discoveryMethod,
      communityValidated: site.communityValidated,
      tags: site.tags.map((t: any) => t.tag),
      discoveredBy: site.submitter ? {
        id: site.submitter.id,
        handle: site.submitter.primaryHandle
      } : undefined,
      recentActivity: {
        discoveries: activityMap.get(site.url) || 0,
        votes: 0 // Could be calculated similarly if needed
      },
      matchScore: (site as any).matchScore
    }));
  }

  /**
   * Generate facet counts for search filters
   */
  private async generateFacets(filters: SearchFilters): Promise<SearchResponse['facets']> {
    // Base where clause without the facet we're counting
    const baseWhere = this.buildWhereClause({ ...filters });

    const [categories, tags, discoveryMethods, scoreRanges, validationStatus] = await Promise.all([
      // Categories facet
      db.indexedSite.groupBy({
        by: ['siteType'],
        where: {
          ...Object.fromEntries(
            Object.entries(baseWhere).filter(([key]) => key !== 'siteType')
          ),
          siteType: { not: null }
        },
        _count: { siteType: true }
      }).then(groups =>
        groups.map(g => ({
          value: g.siteType || '',
          count: g._count.siteType,
          label: this.formatCategoryLabel(g.siteType || '')
        })).filter(c => c.value)
      ),

      // Tags facet
      db.siteTag.groupBy({
        by: ['tag'],
        where: {
          site: {
            ...baseWhere,
            tags: undefined // Remove tag filter for facet counting
          }
        },
        _count: { tag: true },
        orderBy: { _count: { tag: 'desc' } },
        take: 50
      }).then(groups =>
        groups.map(g => ({
          value: g.tag,
          count: g._count.tag
        }))
      ),

      // Discovery methods facet
      db.indexedSite.groupBy({
        by: ['discoveryMethod'],
        where: {
          ...baseWhere,
          discoveryMethod: undefined // Remove discovery method filter
        },
        _count: { discoveryMethod: true }
      }).then(groups =>
        groups.map(g => ({
          value: g.discoveryMethod,
          count: g._count.discoveryMethod,
          label: this.formatDiscoveryMethodLabel(g.discoveryMethod)
        }))
      ),

      // Score ranges facet
      this.getScoreRangeFacets(baseWhere),

      // Validation status facet
      this.getValidationStatusFacets(baseWhere)
    ]);

    return {
      categories,
      tags,
      discoveryMethods,
      scoreRanges,
      validationStatus
    };
  }

  /**
   * Get count for search results
   */
  private async getSearchCount(where: any): Promise<number> {
    return await db.indexedSite.count({ where });
  }

  /**
   * Get score range facets
   */
  private async getScoreRangeFacets(baseWhere: any): Promise<{ range: string; count: number }[]> {
    const ranges = [
      { range: '0-10', min: 0, max: 10 },
      { range: '11-25', min: 11, max: 25 },
      { range: '26-50', min: 26, max: 50 },
      { range: '51+', min: 51, max: 999 }
    ];

    const counts = await Promise.all(
      ranges.map(async (range) => ({
        range: range.range,
        count: await db.indexedSite.count({
          where: {
            ...baseWhere,
            communityScore: { gte: range.min, lte: range.max }
          }
        })
      }))
    );

    return counts.filter(c => c.count > 0);
  }

  /**
   * Get validation status facets
   */
  private async getValidationStatusFacets(baseWhere: any): Promise<{ status: string; count: number; label: string }[]> {
    const [validated, pending] = await Promise.all([
      db.indexedSite.count({
        where: { ...baseWhere, communityValidated: true }
      }),
      db.indexedSite.count({
        where: { ...baseWhere, communityValidated: false }
      })
    ]);

    return [
      { status: 'validated', count: validated, label: 'Community Validated' },
      { status: 'pending', count: pending, label: 'Pending Validation' }
    ].filter(s => s.count > 0);
  }

  /**
   * Format category labels for display
   */
  private formatCategoryLabel(category: string): string {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Format discovery method labels for display
   */
  private formatDiscoveryMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'api_seeding': 'Automated Discovery',
      'manual_submission': 'Community Submission',
      'link_click': 'Link Discovery',
      'search_result': 'Search Result',
      'webring': 'Web Ring',
      'random': 'Random Discovery',
      'surprise': 'Surprise Discovery',
      'validation': 'Validation Process'
    };

    return labels[method] || method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}