/**
 * Crawler worker that processes the crawl queue
 * Updates the database with extracted content
 */

import { db } from '@/lib/config/database/connection';
import { SiteCrawler, type CrawlResult } from './site-crawler';
import type { ExtractedContent } from './content-extractor';
import { QualityAssessor } from './quality-assessor';

export interface CrawlerWorkerOptions {
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  enableLogging?: boolean;
  maxReviewQueueAdditions?: number; // Max number of sites to add to review queue per crawl run
}

export interface DetailedCrawlResult {
  url: string;
  status: 'success' | 'failed' | 'rejected';
  extractedData?: ExtractedContent;
  qualityScore?: {
    totalScore: number;
    breakdown: {
      indieWeb: number;
      personalSite: number;
      contentQuality: number;
      techStack: number;
      language: number;
      freshness: number;
    };
    shouldAutoSubmit: boolean;
    reasons: string[];
    category: string;
  };
  action?: 'added_for_validation' | 'updated_existing' | 'rejected_low_score';
  errorMessage?: string;
  crawlTime?: number;
}

export interface CrawlerStats {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
  autoSubmitted: number;
  qualityScores: Array<{
    url: string;
    score: number;
    shouldAutoSubmit: boolean;
    category: string;
  }>;
  detailedResults: DetailedCrawlResult[];
}

export class CrawlerWorker {
  private crawler: SiteCrawler;
  private qualityAssessor: QualityAssessor;
  private options: Required<CrawlerWorkerOptions>;

  constructor(options: CrawlerWorkerOptions = {}) {
    this.options = {
      batchSize: options.batchSize || 10,
      concurrency: options.concurrency || 3,
      maxRetries: options.maxRetries || 3,
      enableLogging: options.enableLogging ?? true,
      maxReviewQueueAdditions: options.maxReviewQueueAdditions || 5  // Add only top 5 discoveries per run to review queue
    };

    this.crawler = new SiteCrawler({
      userAgent: 'ThreadsteadBot/1.0 (+https://threadstead.com/crawler)',
      timeout: 15000, // 15 seconds for worker
      maxRetries: 2,
      respectRobots: true
    });

    this.qualityAssessor = new QualityAssessor();
  }

  /**
   * Process pending crawl queue items
   */
  async processPendingQueue(): Promise<CrawlerStats> {
    const startTime = Date.now();
    const stats: CrawlerStats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
      autoSubmitted: 0,
      qualityScores: [],
      detailedResults: []
    };

    // NOTE: Removed potentialDiscoveries array - now using immediate processing like seeding


    try {
      // Get pending items, prioritizing NEW sites (not in IndexedSite) for auto-validation
      const pendingItems = await db.$queryRaw`
        SELECT cq.*
        FROM "CrawlQueue" cq
        LEFT JOIN "IndexedSite" idx ON cq.url = idx.url
        WHERE cq.status = 'pending'
          AND cq."scheduledFor" <= NOW()
          AND cq.attempts < ${this.options.maxRetries}
        ORDER BY
          -- Prioritize NEW sites (not in IndexedSite) for auto-validation
          CASE WHEN idx.url IS NULL THEN 1 ELSE 2 END,
          cq.priority DESC,
          cq."scheduledFor" ASC
        LIMIT ${this.options.batchSize}
      ` as any[];

      if (pendingItems.length === 0) {
        this.log('No pending items in crawl queue');
        stats.duration = Date.now() - startTime;
        return stats;
      }

      this.log(`Processing ${pendingItems.length} items from crawl queue`);

      // Mark items as processing
      await this.markAsProcessing(pendingItems.map(item => item.id));

      // Crawl the sites individually to respect extractAllLinks flag
      const crawlResults = [];
      for (const item of pendingItems) {
        const result = await this.crawler.crawlSite(item.url, item.extractAllLinks || false);
        crawlResults.push(result);
      }

      // Process results
      for (let i = 0; i < crawlResults.length; i++) {
        const result = crawlResults[i];
        const queueItem = pendingItems[i];

        stats.processed++;

        try {
          if (result.success && result.content) {
            const crawlStats = await this.handleSuccessfulCrawl(queueItem, result, queueItem.extractAllLinks || false);
            stats.successful++;
            if (crawlStats.autoSubmitted) stats.autoSubmitted++;
            if (crawlStats.qualityScore) stats.qualityScores.push(crawlStats.qualityScore);
            stats.detailedResults.push(crawlStats.detailedResult);
          } else {
            await this.handleFailedCrawl(queueItem, result);
            if (queueItem.attempts + 1 >= this.options.maxRetries) {
              stats.failed++;
            } else {
              stats.skipped++; // Will retry later
            }

            // Add detailed result for failed crawl
            stats.detailedResults.push({
              url: result.url,
              status: 'failed',
              errorMessage: result.error || 'Unknown error',
              crawlTime: result.crawlTime
            });
          }
        } catch (error) {
          const errorMessage = `Database error for ${result.url}: ${error instanceof Error ? error.message : 'Unknown'}`;
          stats.errors.push(errorMessage);
          this.log(errorMessage);

          // Mark as failed in database
          await this.markAsFailed(queueItem.id, errorMessage);
          stats.failed++;

          // Add detailed result for database error
          stats.detailedResults.push({
            url: result.url,
            status: 'failed',
            errorMessage,
            crawlTime: result.crawlTime
          });
        }
      }

      // Trigger Phase 2 auto-validation for any newly added sites
      if (stats.autoSubmitted > 0) {
        this.log(`🤖 Triggering auto-validation for ${stats.autoSubmitted} newly discovered sites...`);
        try {
          await this.triggerAutoValidation();
        } catch (error) {
          this.log(`⚠️ Auto-validation trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      stats.duration = Date.now() - startTime;
      this.log(`Crawl batch completed: ${stats.successful} successful, ${stats.failed} failed, ${stats.skipped} skipped`);

      return stats;

    } catch (error) {
      stats.duration = Date.now() - startTime;
      stats.errors.push(`Worker error: ${error instanceof Error ? error.message : 'Unknown'}`);
      this.log(`Crawler worker error: ${error}`);
      return stats;
    }
  }

  /**
   * Handle successful crawl result
   */
  private async handleSuccessfulCrawl(
    queueItem: any,
    result: CrawlResult,
    extractAllLinks: boolean = false
  ): Promise<{
    autoSubmitted: boolean;
    qualityScore?: {
      url: string;
      score: number;
      shouldAutoSubmit: boolean;
      category: string;
    };
    detailedResult: DetailedCrawlResult;
  }> {
    const content = result.content!;

    // Assess quality for potential auto-submission
    const qualityScore = this.qualityAssessor.assessQuality(content, result.url);
    let autoSubmitted = false;
    let action: 'added_for_validation' | 'updated_existing' | 'rejected_low_score';

    // Update the indexed site with crawled content
    const existingSite = await db.indexedSite.findUnique({
      where: { url: result.url }
    });

    if (existingSite) {
      // Update existing site with crawled data
      await db.indexedSite.update({
        where: { id: existingSite.id },
        data: {
          title: content.title || existingSite.title,
          description: content.description || content.snippet || existingSite.description,
          crawlStatus: 'success',
          lastCrawled: new Date(),
          extractedKeywords: content.keywords,
          contentSample: content.snippet,
          detectedLanguage: content.language,
          responseTimeMs: result.crawlTime,
          sslEnabled: result.url.startsWith('https://'),
          outboundLinks: content.links, // Store extracted outbound links
        }
      });

      // Queue discovered links for crawling if they're not already indexed
      await this.queueDiscoveredLinks(content.links, extractAllLinks);

      action = 'updated_existing';
      this.log(`✅ Updated site: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100]`);
    } else {
      // Site not in index - USE PHASE 2 AUTO-VALIDATION SYSTEM
      if (qualityScore.shouldAutoSubmit && qualityScore.totalScore >= 50) {
        try {
          await this.addToIndexForAutoValidation(result.url, content, qualityScore);
          autoSubmitted = true;
          action = 'added_for_validation';

          // Queue discovered links for crawling
          await this.queueDiscoveredLinks(content.links, extractAllLinks);

          this.log(`✅ Added for auto-validation: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100]`);
        } catch (error) {
          this.log(`❌ Failed to add for auto-validation: ${content.title} (${result.url}) - ${error instanceof Error ? error.message : 'Unknown error'}`);
          autoSubmitted = false;
          action = 'rejected_low_score';
        }
      } else {
        action = 'rejected_low_score';
        this.log(`⏭️ Rejected: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100] - below threshold`);
      }
    }

    // Mark crawl queue item as completed
    await db.crawlQueue.update({
      where: { id: queueItem.id },
      data: {
        status: 'completed',
        lastAttempt: new Date(),
        errorMessage: null
      }
    });

    const detailedResult: DetailedCrawlResult = {
      url: result.url,
      status: 'success',
      extractedData: content,
      qualityScore: {
        totalScore: qualityScore.totalScore,
        breakdown: qualityScore.breakdown,
        shouldAutoSubmit: qualityScore.shouldAutoSubmit,
        reasons: qualityScore.reasons,
        category: qualityScore.category
      },
      action,
      crawlTime: result.crawlTime
    };

    return {
      autoSubmitted,
      qualityScore: {
        url: result.url,
        score: qualityScore.totalScore,
        shouldAutoSubmit: qualityScore.shouldAutoSubmit,
        category: qualityScore.category
      },
      detailedResult
    };
  }

  /**
   * Handle failed crawl result
   */
  private async handleFailedCrawl(queueItem: any, result: CrawlResult): Promise<void> {
    const newAttempts = queueItem.attempts + 1;

    if (newAttempts >= this.options.maxRetries) {
      // Mark as permanently failed
      await db.crawlQueue.update({
        where: { id: queueItem.id },
        data: {
          status: 'failed',
          attempts: newAttempts,
          lastAttempt: new Date(),
          errorMessage: result.error || 'Unknown error'
        }
      });

      // Update the indexed site status
      await db.indexedSite.updateMany({
        where: { url: result.url },
        data: {
          crawlStatus: 'failed',
          lastCrawled: new Date()
        }
      });

      this.log(`❌ Permanently failed: ${result.url} (${result.error})`);
    } else {
      // Schedule for retry with exponential backoff
      const backoffMinutes = Math.pow(2, newAttempts) * 5; // 10, 20, 40 minutes
      const retryTime = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await db.crawlQueue.update({
        where: { id: queueItem.id },
        data: {
          status: 'pending',
          attempts: newAttempts,
          lastAttempt: new Date(),
          scheduledFor: retryTime,
          errorMessage: result.error || 'Unknown error'
        }
      });

      this.log(`🔄 Scheduled retry for ${result.url} at ${retryTime.toISOString()} (attempt ${newAttempts})`);
    }
  }

  /**
   * Mark items as processing
   */
  private async markAsProcessing(itemIds: string[]): Promise<void> {
    await db.crawlQueue.updateMany({
      where: { id: { in: itemIds } },
      data: {
        status: 'processing',
        lastAttempt: new Date()
      }
    });
  }

  /**
   * Mark item as failed (for database errors)
   */
  private async markAsFailed(itemId: string, error: string): Promise<void> {
    await db.crawlQueue.update({
      where: { id: itemId },
      data: {
        status: 'failed',
        lastAttempt: new Date(),
        errorMessage: error
      }
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
    oldestPending?: Date;
    newestCompleted?: Date;
  }> {
    const [pending, processing, completed, failed, total, oldestPending, newestCompleted] = await Promise.all([
      db.crawlQueue.count({ where: { status: 'pending' } }),
      db.crawlQueue.count({ where: { status: 'processing' } }),
      db.crawlQueue.count({ where: { status: 'completed' } }),
      db.crawlQueue.count({ where: { status: 'failed' } }),
      db.crawlQueue.count(),
      db.crawlQueue.findFirst({
        where: { status: 'pending' },
        orderBy: { scheduledFor: 'asc' },
        select: { scheduledFor: true }
      }),
      db.crawlQueue.findFirst({
        where: { status: 'completed' },
        orderBy: { lastAttempt: 'desc' },
        select: { lastAttempt: true }
      })
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total,
      oldestPending: oldestPending?.scheduledFor,
      newestCompleted: newestCompleted?.lastAttempt || undefined
    };
  }

  /**
   * Add a site to index for Phase 2 auto-validation processing
   */
  private async addToIndexForAutoValidation(
    url: string,
    content: ExtractedContent,
    qualityScore: any
  ): Promise<void> {
    // Create IndexedSite record with api_seeding method for Phase 2 auto-validation
    const indexedSite = await db.indexedSite.create({
      data: {
        url,
        title: content.title || 'Untitled',
        description: content.description || content.snippet || 'Auto-discovered during crawling',
        discoveryMethod: 'api_seeding', // Use api_seeding for Phase 2 consistency
        discoveryContext: 'Auto-discovered by crawler',
        siteType: qualityScore.category || 'personal_blog',

        // Quality scoring fields for Phase 2 auto-validation
        seedingScore: qualityScore.totalScore,
        seedingReasons: qualityScore.reasons || [],

        // Let Phase 2 auto-validation determine these
        communityValidated: false,
        communityScore: 0,
        validationVotes: 0,

        // Content fields
        extractedKeywords: content.keywords || [],
        detectedLanguage: content.language || 'en',
        contentSample: content.snippet,

        // Crawl status
        lastCrawled: new Date(),
        crawlStatus: 'success',
        sslEnabled: url.startsWith('https://'),
        responseTimeMs: 0,
        outboundLinks: content.links || [],

        // Discovery timestamp
        discoveredAt: new Date(),
      }
    });

    this.log(`📊 Added to index for auto-validation: ${content.title} (${url}) [Score: ${qualityScore.totalScore}/100]`);
  }

  /**
   * Add a site to the discovery queue
   */
  private async addToDiscoveryQueue(
    url: string,
    content: ExtractedContent,
    qualityScore: any,
    reviewStatus: 'pending' | 'approved' = 'pending'
  ): Promise<boolean> {
    try {
      // Create DiscoveredSite record for review
      await db.discoveredSite.create({
        data: {
          url,
          title: content.title,
          description: content.description || content.snippet,
          discoveredAt: new Date(),
          discoveryMethod: 'api_seeding',
          discoveryContext: `Auto-discovered during crawling`,
          qualityScore: qualityScore.totalScore,
          qualityReasons: qualityScore.reasons,
          suggestedCategory: qualityScore.category,
          contentSample: content.snippet,
          extractedKeywords: content.keywords,
          detectedLanguage: content.language,
          lastCrawled: new Date(),
          crawlStatus: 'success',
          sslEnabled: url.startsWith('https://'),
          outboundLinks: content.links,
          reviewStatus,
        }
      });

      this.log(`🔍 Added to discovery queue: ${content.title} (${url}) [Score: ${qualityScore.totalScore}/100, Status: ${reviewStatus}]`);
      return true;
    } catch (error) {
      this.log(`❌ Failed to add to discovery queue ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Queue discovered links for crawling if they're not already indexed or queued
   */
  private async queueDiscoveredLinks(links: string[], extractAllLinks: boolean = false): Promise<void> {
    if (links.length === 0) return;

    // Limit discovered links to prevent exponential growth
    // Use higher limit when explicitly extracting all links (e.g., webring pages)
    const MAX_LINKS_PER_SITE = extractAllLinks ? 100 : 10;
    const linksToCheck = links.slice(0, MAX_LINKS_PER_SITE);

    // Filter out links that are already indexed or in the crawl queue
    const existingUrls = await db.indexedSite.findMany({
      where: { url: { in: linksToCheck } },
      select: { url: true }
    });

    const queuedUrls = await db.crawlQueue.findMany({
      where: { url: { in: linksToCheck } },
      select: { url: true }
    });

    const existingUrlSet = new Set([
      ...existingUrls.map(site => site.url),
      ...queuedUrls.map(item => item.url)
    ]);

    const newLinks = linksToCheck.filter(link => !existingUrlSet.has(link));

    if (newLinks.length === 0) {
      this.log(`No new links to queue (${linksToCheck.length} links already known)`);
      return;
    }

    // Check current queue size to prevent unbounded growth
    const currentQueueSize = await db.crawlQueue.count({ where: { status: 'pending' } });
    const MAX_QUEUE_SIZE = 5000; // Cap queue at 5000 pending items

    if (currentQueueSize >= MAX_QUEUE_SIZE) {
      this.log(`⚠️ Queue at capacity (${currentQueueSize}/${MAX_QUEUE_SIZE}), skipping link discovery`);
      return;
    }

    // Calculate how many we can add without exceeding limit
    const slotsAvailable = Math.min(newLinks.length, MAX_QUEUE_SIZE - currentQueueSize);
    const linksToAdd = newLinks.slice(0, slotsAvailable);

    // Add new links to crawl queue with low priority
    const queueItems = linksToAdd.map(url => ({
      url,
      priority: 1, // Even lower priority for discovered links
      scheduledFor: new Date(Date.now() + (48 + Math.random() * 72) * 60 * 60 * 1000), // 2-5 days delay
    }));

    await db.crawlQueue.createMany({
      data: queueItems,
      skipDuplicates: true
    });

    this.log(`🔗 Queued ${linksToAdd.length}/${links.length} discovered links (queue: ${currentQueueSize + linksToAdd.length}/${MAX_QUEUE_SIZE})`);
  }

  /**
   * Clean up old completed items
   */
  async cleanupOldItems(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await db.crawlQueue.deleteMany({
      where: {
        status: 'completed',
        lastAttempt: { lt: cutoffDate }
      }
    });

    this.log(`Cleaned up ${result.count} old completed crawl items`);
    return result.count;
  }

  /**
   * Get recent crawl activity logs
   */
  async getRecentActivity(limit: number = 50, status?: string): Promise<any[]> {
    const where = status ? { status } : {};

    const items = await db.crawlQueue.findMany({
      where: {
        ...where,
        lastAttempt: { not: null }
      },
      orderBy: { lastAttempt: 'desc' },
      take: limit,
      select: {
        id: true,
        url: true,
        status: true,
        attempts: true,
        lastAttempt: true,
        errorMessage: true,
        priority: true,
        createdAt: true
      }
    });

    return items;
  }

  /**
   * Get paginated queue items
   */
  async getQueueItems(options: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'priority' | 'scheduledFor' | 'attempts';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      status,
      page = 1,
      limit = 50,
      search,
      sortBy = 'scheduledFor',
      sortOrder = 'asc'
    } = options;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.url = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      db.crawlQueue.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          url: true,
          priority: true,
          scheduledFor: true,
          attempts: true,
          lastAttempt: true,
          status: true,
          errorMessage: true,
          createdAt: true
        }
      }),
      db.crawlQueue.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Add URL to crawl queue
   */
  async addToQueue(
    url: string,
    priority: number = 3,
    scheduledFor?: Date,
    extractAllLinks: boolean = false
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Check if URL already exists
      const existing = await db.crawlQueue.findFirst({
        where: { url }
      });

      if (existing) {
        return {
          success: false,
          error: 'URL already in queue'
        };
      }

      const queueItem = await db.crawlQueue.create({
        data: {
          url,
          priority: Math.max(1, Math.min(5, priority)), // Clamp 1-5
          scheduledFor: scheduledFor || new Date(),
          status: 'pending',
          extractAllLinks
        }
      });

      this.log(`Added to queue: ${url} (priority: ${priority}, extractAllLinks: ${extractAllLinks})`);

      return {
        success: true,
        id: queueItem.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retry all failed items
   */
  async retryFailedItems(): Promise<{
    success: boolean;
    retriedCount: number;
    error?: string;
  }> {
    try {
      const result = await db.crawlQueue.updateMany({
        where: { status: 'failed' },
        data: {
          status: 'pending',
          scheduledFor: new Date(),
          attempts: 0,
          errorMessage: null
        }
      });

      this.log(`Retried ${result.count} failed items`);

      return {
        success: true,
        retriedCount: result.count
      };
    } catch (error) {
      return {
        success: false,
        retriedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test crawl a single URL without affecting the queue
   * Returns detailed extraction and quality assessment
   */
  async testCrawlUrl(url: string): Promise<DetailedCrawlResult> {
    try {
      // Validate URL
      new URL(url);

      // Crawl the site
      const result = await this.crawler.crawlSite(url);

      if (!result.success || !result.content) {
        return {
          url,
          status: 'failed',
          errorMessage: result.error || 'Failed to extract content',
          crawlTime: result.crawlTime
        };
      }

      // Assess quality
      const qualityScore = this.qualityAssessor.assessQuality(result.content, url);

      // Determine what would happen
      let action: 'added_for_validation' | 'updated_existing' | 'rejected_low_score';
      const existingSite = await db.indexedSite.findUnique({
        where: { url }
      });

      if (existingSite) {
        action = 'updated_existing';
      } else if (qualityScore.shouldAutoSubmit && qualityScore.totalScore >= 40) {
        action = 'added_for_validation';
      } else {
        action = 'rejected_low_score';
      }

      return {
        url,
        status: action === 'rejected_low_score' ? 'rejected' : 'success',
        extractedData: result.content,
        qualityScore: {
          totalScore: qualityScore.totalScore,
          breakdown: qualityScore.breakdown,
          shouldAutoSubmit: qualityScore.shouldAutoSubmit,
          reasons: qualityScore.reasons,
          category: qualityScore.category
        },
        action,
        crawlTime: result.crawlTime
      };
    } catch (error) {
      return {
        url,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get enhanced queue statistics with additional metrics
   */
  async getEnhancedStats(): Promise<{
    queue: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      total: number;
      oldestPending?: Date;
      newestCompleted?: Date;
    };
    health: {
      successRate: number;
      averageCrawlTime: number;
      recentErrors: string[];
    };
  }> {
    const queueStats = await this.getQueueStats();

    // Calculate success rate from last 100 items
    const recentItems = await db.crawlQueue.findMany({
      where: {
        lastAttempt: { not: null }
      },
      orderBy: { lastAttempt: 'desc' },
      take: 100,
      select: {
        status: true,
        errorMessage: true
      }
    });

    const successCount = recentItems.filter(item => item.status === 'completed').length;
    const successRate = recentItems.length > 0 ? successCount / recentItems.length : 0;

    // Get recent unique error messages
    const recentErrors = Array.from(
      new Set(
        recentItems
          .filter(item => item.errorMessage)
          .map(item => item.errorMessage)
          .slice(0, 5)
      )
    ) as string[];

    return {
      queue: queueStats,
      health: {
        successRate,
        averageCrawlTime: 0, // Can be calculated from actual crawl times if stored
        recentErrors
      }
    };
  }

  /**
   * Trigger Phase 2 auto-validation for pending sites
   */
  private async triggerAutoValidation(): Promise<void> {
    try {
      const response = await fetch('http://localhost:3000/api/community-index/auto-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: false }),
      });

      if (response.ok) {
        const result = await response.json();
        this.log(`✅ Auto-validation completed: ${result.results.approved} approved, ${result.results.rejected} rejected, ${result.results.skipped} skipped`);
      } else {
        this.log(`❌ Auto-validation API failed: ${response.status}`);
      }
    } catch (error) {
      this.log(`❌ Auto-validation request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[CrawlerWorker] ${new Date().toISOString()} ${message}`);
    }
  }
}