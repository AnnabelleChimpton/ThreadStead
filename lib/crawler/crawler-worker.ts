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
      qualityScores: []
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

      // Extract URLs for crawling
      const urls = pendingItems.map(item => item.url);

      // Mark items as processing
      await this.markAsProcessing(pendingItems.map(item => item.id));

      // Crawl the sites
      const crawlResults = await this.crawler.crawlMultiple(urls, this.options.concurrency);

      // Process results
      for (let i = 0; i < crawlResults.length; i++) {
        const result = crawlResults[i];
        const queueItem = pendingItems[i];

        stats.processed++;

        try {
          if (result.success && result.content) {
            const crawlStats = await this.handleSuccessfulCrawl(queueItem, result);
            stats.successful++;
            if (crawlStats.autoSubmitted) stats.autoSubmitted++;
            if (crawlStats.qualityScore) stats.qualityScores.push(crawlStats.qualityScore);
          } else {
            await this.handleFailedCrawl(queueItem, result);
            if (queueItem.attempts + 1 >= this.options.maxRetries) {
              stats.failed++;
            } else {
              stats.skipped++; // Will retry later
            }
          }
        } catch (error) {
          const errorMessage = `Database error for ${result.url}: ${error instanceof Error ? error.message : 'Unknown'}`;
          stats.errors.push(errorMessage);
          this.log(errorMessage);

          // Mark as failed in database
          await this.markAsFailed(queueItem.id, errorMessage);
          stats.failed++;
        }
      }

      // NOTE: Removed broken potentialDiscoveries logic - now using immediate processing like seeding

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
    result: CrawlResult
  ): Promise<{
    autoSubmitted: boolean;
    qualityScore?: {
      url: string;
      score: number;
      shouldAutoSubmit: boolean;
      category: string;
    };
  }> {
    const content = result.content!;

    // Assess quality for potential auto-submission
    const qualityScore = this.qualityAssessor.assessQuality(content, result.url);
    let autoSubmitted = false;

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
      await this.queueDiscoveredLinks(content.links);

      this.log(`✅ Updated site: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100]`);
    } else {
      // Site not in index - MATCH SEEDING LOGIC EXACTLY: immediate processing
      if (qualityScore.shouldAutoSubmit && qualityScore.totalScore >= 40) {
        // Use same logic as seeding: immediate addition to IndexedSite, no deferred processing
        try {
          await this.addToIndexDirectly(result.url, content, qualityScore);
          autoSubmitted = true;
          this.log(`✅ Added to index: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100]`);
        } catch (error) {
          this.log(`❌ Failed to add to index: ${content.title} (${result.url}) - ${error instanceof Error ? error.message : 'Unknown error'}`);
          autoSubmitted = false;
        }
      } else {
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

    return {
      autoSubmitted,
      qualityScore: {
        url: result.url,
        score: qualityScore.totalScore,
        shouldAutoSubmit: qualityScore.shouldAutoSubmit,
        category: qualityScore.category
      }
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
   * Add a site directly to the index (MATCHES SEEDING LOGIC EXACTLY)
   */
  private async addToIndexDirectly(
    url: string,
    content: ExtractedContent,
    qualityScore: any
  ): Promise<void> {
    // Determine auto-validation based on quality score (same logic as seeding)
    const shouldAutoValidate = qualityScore.totalScore >= 70; // Seeding phase threshold
    const initialCommunityScore = shouldAutoValidate ? Math.floor(qualityScore.totalScore / 10) : 0;

    // Create IndexedSite record - EXACT SAME FIELDS AS SEEDING
    const indexedSite = await db.indexedSite.create({
      data: {
        url,
        title: content.title || 'Untitled',
        description: content.description || content.snippet || 'Auto-discovered during crawling',
        discoveryMethod: 'crawler_auto_submit',
        discoveryContext: 'Auto-discovered and validated by crawler',
        siteType: qualityScore.suggestedCategory || 'personal_blog',

        // Quality scoring fields (match seeding)
        seedingScore: qualityScore.totalScore,
        seedingReasons: qualityScore.reasons || [],

        // Community validation
        communityValidated: shouldAutoValidate,
        communityScore: initialCommunityScore,
        validationVotes: shouldAutoValidate ? 1 : 0,

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

        // Discovery timestamp (CRITICAL MISSING FIELD)
        discoveredAt: new Date(),
      }
    });

    // Update crawl queue item status (since it was already processed from queue)
    await db.crawlQueue.updateMany({
      where: {
        url,
        status: 'pending'
      },
      data: {
        status: 'completed',
        lastAttempt: new Date(),
        attempts: 1
      }
    });

    this.log(`📊 Added to index: ${content.title} (${url}) [Score: ${qualityScore.totalScore}/100, Auto-validated: ${shouldAutoValidate}]`);
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
          discoveryMethod: 'crawler_auto_submit',
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
  private async queueDiscoveredLinks(links: string[]): Promise<void> {
    if (links.length === 0) return;

    // Limit discovered links to prevent exponential growth
    const MAX_LINKS_PER_SITE = 10; // Only queue top 10 links per site
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

  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[CrawlerWorker] ${new Date().toISOString()} ${message}`);
    }
  }
}