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

    // Collect potential discoveries during this crawl run
    const potentialDiscoveries: Array<{
      url: string;
      content: ExtractedContent;
      qualityScore: any;
    }> = [];


    try {
      // Get pending items ordered by priority and schedule
      const pendingItems = await db.crawlQueue.findMany({
        where: {
          status: 'pending',
          scheduledFor: { lte: new Date() },
          attempts: { lt: this.options.maxRetries }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledFor: 'asc' }
        ],
        take: this.options.batchSize
      });

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
            const crawlStats = await this.handleSuccessfulCrawl(queueItem, result, potentialDiscoveries);
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

      // Process potential discoveries - add only the highest scoring ones to review queue
      if (potentialDiscoveries.length > 0) {
        const topDiscoveries = potentialDiscoveries
          .filter(d => d.qualityScore.shouldAutoSubmit && d.qualityScore.totalScore < 75) // Not auto-approved
          .sort((a, b) => b.qualityScore.totalScore - a.qualityScore.totalScore)
          .slice(0, this.options.maxReviewQueueAdditions);

        for (const discovery of topDiscoveries) {
          const submitted = await this.addToDiscoveryQueue(discovery.url, discovery.content, discovery.qualityScore);
          if (submitted) stats.autoSubmitted++;
        }

        this.log(`📊 Discovery summary: ${potentialDiscoveries.length} potential, ${topDiscoveries.length} added to review queue`);
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
    potentialDiscoveries: Array<{
      url: string;
      content: ExtractedContent;
      qualityScore: any;
    }>
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
      // Site not in index - assess for potential discovery
      if (qualityScore.shouldAutoSubmit) {
        if (qualityScore.totalScore >= 75) {
          // High quality - auto-approve directly to main index (like seeding does)
          autoSubmitted = await this.addToMainIndex(result.url, content, qualityScore);
          if (autoSubmitted) {
            this.log(`⚡ Auto-validated to main index: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100]`);
          }
        } else {
          // Good quality - add to potential discoveries for later review queue selection
          potentialDiscoveries.push({
            url: result.url,
            content,
            qualityScore
          });
          this.log(`📋 Potential discovery: ${content.title} (${result.url}) [Score: ${qualityScore.totalScore}/100]`);
        }
      } else {
        this.log(`⚠️ Site not in index, quality too low for discovery: ${result.url} [Score: ${qualityScore.totalScore}/100]`);
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
   * Add a site directly to the main index (for high-quality auto-validated sites)
   */
  private async addToMainIndex(
    url: string,
    content: ExtractedContent,
    qualityScore: any
  ): Promise<boolean> {
    try {
      // Create IndexedSite record directly (like seeding does)
      await db.indexedSite.create({
        data: {
          url,
          title: content.title,
          description: content.description || content.snippet || 'Auto-discovered during crawling',
          discoveryMethod: 'crawler_auto_submit',
          discoveryContext: 'Auto-discovered and validated by crawler',
          siteType: qualityScore.category,
          communityValidated: true, // Auto-validated based on quality score
          communityScore: Math.floor(qualityScore.totalScore / 10), // Convert 0-100 to 0-10 scale
          validationVotes: 1, // Initial vote from crawler validation
          extractedKeywords: content.keywords || [],
          detectedLanguage: content.language,
          contentSample: content.snippet,
          lastCrawled: new Date(),
          crawlStatus: 'success',
          sslEnabled: url.startsWith('https://'),
          responseTimeMs: 0, // We don't track this in crawler yet
          outboundLinks: content.links || [],
        }
      });

      this.log(`📊 Added to main index: ${content.title} (${url}) [Score: ${qualityScore.totalScore}/100]`);
      return true;
    } catch (error) {
      this.log(`❌ Failed to add to main index ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
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