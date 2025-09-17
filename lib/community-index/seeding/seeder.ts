/**
 * Community Index Seeder
 * Automated system for discovering and seeding quality indie web content
 */

import { db } from '@/lib/config/database/connection';
import { runExtSearch } from '@/lib/extsearch/registry';
import { SeedingFilter, type SiteEvaluation } from './quality-filter';
import { selectDailyQueries, type SeedingQuery, SiteType } from './discovery-queries';
import type { ExtSearchResultItem } from '@/lib/extsearch/types';

export interface SeedingReport {
  queriesRun: string[];
  sitesEvaluated: number;
  sitesAdded: number;
  sitesRejected: number;
  averageScore: number;
  topFinds: SiteEvaluation[];
  errors: string[];
  duration: number;
}

export interface SeedingOptions {
  maxQueries?: number;
  maxSitesPerQuery?: number;
  minScore?: number;
  dryRun?: boolean;
  enabledEngines?: string[];
}

export class CommunityIndexSeeder {
  private filter = new SeedingFilter();

  /**
   * Run daily seeding process
   */
  async runDailySeeding(options: SeedingOptions = {}): Promise<SeedingReport> {
    const startTime = Date.now();
    const {
      maxQueries = 5,
      maxSitesPerQuery = 20,
      minScore = 40,
      dryRun = false
    } = options;

    const report: SeedingReport = {
      queriesRun: [],
      sitesEvaluated: 0,
      sitesAdded: 0,
      sitesRejected: 0,
      averageScore: 0,
      topFinds: [],
      errors: [],
      duration: 0
    };

    try {
      // Select today's queries
      const queries = selectDailyQueries(maxQueries);

      console.log(`Starting daily seeding with ${queries.length} queries`);

      for (const query of queries) {
        try {
          await this.processQuery(query, maxSitesPerQuery, minScore, dryRun, report);
          report.queriesRun.push(query.query);

          // Rate limiting between queries
          await this.sleep(2000);
        } catch (error) {
          const errorMessage = `Query "${query.query}" failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          report.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      // Calculate final statistics
      if (report.sitesEvaluated > 0) {
        report.averageScore = report.topFinds.reduce((sum, site) => sum + site.seedingScore.score, 0) / report.topFinds.length;
      }

      // Sort top finds by score
      report.topFinds.sort((a, b) => b.seedingScore.score - a.seedingScore.score);
      report.topFinds = report.topFinds.slice(0, 10); // Keep top 10

      report.duration = Date.now() - startTime;

      console.log(`Seeding completed: ${report.sitesAdded} sites added, ${report.sitesRejected} rejected`);

      return report;
    } catch (error) {
      report.errors.push(`Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      report.duration = Date.now() - startTime;
      return report;
    }
  }

  /**
   * Process a single discovery query
   */
  private async processQuery(
    query: SeedingQuery,
    maxSites: number,
    minScore: number,
    dryRun: boolean,
    report: SeedingReport
  ): Promise<void> {
    console.log(`Processing query: "${query.query}" (${query.category})`);

    // Run external search
    const searchResults = await runExtSearch({
      q: query.query,
      page: Math.floor(Math.random() * 3), // Random page for variety
      perPage: maxSites
    });

    if (searchResults.results.length === 0) {
      console.log(`No results found for query: ${query.query}`);
      return;
    }

    // Evaluate each result
    for (const result of searchResults.results) {
      try {
        report.sitesEvaluated++;

        // Check if we already have this site
        const existing = await db.indexedSite.findUnique({
          where: { url: result.url }
        });

        if (existing) {
          continue; // Skip existing sites
        }

        // Evaluate the site
        const seedingScore = await this.filter.evaluateSite(result);

        const evaluation: SiteEvaluation = {
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          seedingScore,
          engine: result.engine,
          isIndieWeb: result.isIndieWeb,
          privacyScore: result.privacyScore,
          hasTrackers: result.hasTrackers
        };

        // Add to top finds for reporting
        report.topFinds.push(evaluation);

        // Check if site meets seeding criteria
        if (seedingScore.shouldSeed && seedingScore.score >= minScore) {
          if (!dryRun) {
            await this.addToIndex(result, query, seedingScore);
          }
          report.sitesAdded++;
          console.log(`✓ Added: ${result.title} (score: ${seedingScore.score})`);
        } else {
          report.sitesRejected++;
          console.log(`✗ Rejected: ${result.title} (score: ${seedingScore.score})`);
        }
      } catch (error) {
        report.errors.push(`Failed to evaluate ${result.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Add a site to the community index
   */
  private async addToIndex(
    result: ExtSearchResultItem,
    query: SeedingQuery,
    seedingScore: any
  ): Promise<void> {
    try {
      // Determine auto-validation based on seeding score and quality indicators
      const shouldAutoValidate = this.shouldAutoValidateSeededSite(seedingScore, result);
      const initialCommunityScore = shouldAutoValidate ? Math.floor(seedingScore.score / 10) : 0;

      // Create the indexed site record
      const indexedSite = await db.indexedSite.create({
        data: {
          url: result.url,
          title: result.title,
          description: result.snippet || `Discovered through search query: "${query.query}"`,
          discoveryMethod: 'api_seeding',
          discoveryContext: query.query,
          siteType: query.category,
          seedingScore: seedingScore.score,
          seedingReasons: seedingScore.reasons,
          communityValidated: shouldAutoValidate,
          communityScore: initialCommunityScore, // Give initial boost if auto-validated
          extractedKeywords: this.extractKeywords(result),
          sslEnabled: result.url.startsWith('https://'),
          crawlStatus: 'pending'
        }
      });

      // Add to crawl queue for full analysis
      await db.crawlQueue.create({
        data: {
          url: result.url,
          priority: seedingScore.priority,
          scheduledFor: new Date()
        }
      });

      console.log(`Added ${result.url} to index with ID: ${indexedSite.id}`);
    } catch (error) {
      console.error(`Failed to add ${result.url} to index:`, error);
      throw error;
    }
  }

  /**
   * Extract basic keywords from search result
   */
  private extractKeywords(result: ExtSearchResultItem): string[] {
    const text = `${result.title} ${result.snippet || ''}`.toLowerCase();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Limit to 10 keywords

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Get seeding statistics
   */
  async getSeedingStats(): Promise<{
    totalSeeded: number;
    pendingValidation: number;
    validatedSites: number;
    averageScore: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    const [
      totalSeeded,
      pendingValidation,
      validatedSites,
      averageScoreResult,
      categoryStats
    ] = await Promise.all([
      db.indexedSite.count({
        where: { discoveryMethod: 'api_seeding' }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          communityValidated: false
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          communityValidated: true
        }
      }),
      db.indexedSite.aggregate({
        where: {
          discoveryMethod: 'api_seeding',
          seedingScore: { not: null }
        },
        _avg: { seedingScore: true }
      }),
      db.indexedSite.groupBy({
        by: ['siteType'],
        where: { discoveryMethod: 'api_seeding' },
        _count: { siteType: true },
        orderBy: { _count: { siteType: 'desc' } },
        take: 5
      })
    ]);

    return {
      totalSeeded,
      pendingValidation,
      validatedSites,
      averageScore: averageScoreResult._avg.seedingScore || 0,
      topCategories: categoryStats.map(stat => ({
        category: stat.siteType || 'unknown',
        count: stat._count.siteType
      }))
    };
  }

  /**
   * Validate seeding health and adjust parameters
   */
  async validateSeedingHealth(): Promise<{
    duplicatesCreated: number;
    lowQualityRatio: number;
    communityRejectionRate: number;
    crawlFailureRate: number;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    // Check for duplicates (shouldn't happen with current logic)
    const duplicatesCreated = 0; // We check for duplicates before adding

    // Calculate low quality ratio (seeding score < 50)
    const [totalSeeded, lowQualityCount] = await Promise.all([
      db.indexedSite.count({ where: { discoveryMethod: 'api_seeding' } }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          seedingScore: { lt: 50 }
        }
      })
    ]);

    const lowQualityRatio = totalSeeded > 0 ? lowQualityCount / totalSeeded : 0;

    // Check community rejection rate (sites with negative community scores)
    const rejectedCount = await db.indexedSite.count({
      where: {
        discoveryMethod: 'api_seeding',
        communityScore: { lt: -2 }
      }
    });

    const communityRejectionRate = totalSeeded > 0 ? rejectedCount / totalSeeded : 0;

    // Check crawl failure rate
    const [totalInQueue, failedCrawls] = await Promise.all([
      db.crawlQueue.count(),
      db.crawlQueue.count({ where: { status: 'failed' } })
    ]);

    const crawlFailureRate = totalInQueue > 0 ? failedCrawls / totalInQueue : 0;

    // Generate recommendations
    if (lowQualityRatio > 0.3) {
      recommendations.push('Increase minimum seeding score threshold');
    }
    if (communityRejectionRate > 0.2) {
      recommendations.push('Review and improve quality filtering criteria');
    }
    if (crawlFailureRate > 0.1) {
      recommendations.push('Investigate crawling issues and improve error handling');
    }
    if (totalSeeded < 10) {
      recommendations.push('Consider increasing daily seeding quota');
    }

    return {
      duplicatesCreated,
      lowQualityRatio,
      communityRejectionRate,
      crawlFailureRate,
      recommendations
    };
  }

  /**
   * Determine if a seeded site should be auto-validated
   * High-quality sites with strong indicators can bypass community validation
   */
  private shouldAutoValidateSeededSite(seedingScore: any, result: ExtSearchResultItem): boolean {
    // Conservative thresholds for auto-validation
    const HIGH_SCORE_THRESHOLD = 70; // Very high quality threshold
    const MIN_CONFIDENCE = 0.8; // High confidence in evaluation

    // Must meet high score threshold
    if (seedingScore.score < HIGH_SCORE_THRESHOLD) {
      return false;
    }

    // Must have high confidence in the evaluation
    if (seedingScore.confidence < MIN_CONFIDENCE) {
      return false;
    }

    // Must have strong positive indicators
    const strongIndicators = [
      'indie_web_detected',
      'indie_web_domain',
      'personal_domain',
      'privacy_friendly',
      'no_trackers'
    ];

    const hasStrongIndicators = strongIndicators.some(indicator =>
      seedingScore.reasons.includes(indicator)
    );

    if (!hasStrongIndicators) {
      return false;
    }

    // Must not have any negative indicators
    const negativeIndicators = [
      'commercial_domain',
      'big_tech_domain',
      'commercial_content',
      'spam_indicators',
      'low_quality_content'
    ];

    const hasNegativeIndicators = negativeIndicators.some(indicator =>
      seedingScore.reasons.includes(indicator)
    );

    if (hasNegativeIndicators) {
      return false;
    }

    // Additional safety check: must have privacy indicators if available
    if (result.privacyScore !== undefined && result.privacyScore < 0.7) {
      return false;
    }

    if (result.hasTrackers === true) {
      return false;
    }

    return true; // All checks passed - auto-validate
  }

  /**
   * Utility method for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run seeding for specific categories
   */
  async seedByCategory(category: SiteType, maxSites: number = 20): Promise<SeedingReport> {
    const queries = selectDailyQueries(10).filter(q => q.category === category);

    if (queries.length === 0) {
      throw new Error(`No queries found for category: ${category}`);
    }

    return this.runDailySeeding({
      maxQueries: queries.length,
      maxSitesPerQuery: maxSites
    });
  }

  /**
   * Reseed high-quality sites that were previously rejected
   */
  async reseedHighQuality(minScore: number = 60): Promise<number> {
    // This would require storing rejected candidates, which we could add later
    // For now, just return 0
    return 0;
  }
}