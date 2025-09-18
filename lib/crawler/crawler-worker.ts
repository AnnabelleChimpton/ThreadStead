/**
 * Crawler worker that processes the crawl queue
 * Updates the database with extracted content
 */

import { db } from '@/lib/config/database/connection';
import { SiteCrawler, type CrawlResult } from './site-crawler';
import type { ExtractedContent } from './content-extractor';

export interface CrawlerWorkerOptions {
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  enableLogging?: boolean;
}

export interface CrawlerStats {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

export class CrawlerWorker {
  private crawler: SiteCrawler;
  private options: Required<CrawlerWorkerOptions>;

  constructor(options: CrawlerWorkerOptions = {}) {
    this.options = {
      batchSize: options.batchSize || 10,
      concurrency: options.concurrency || 3,
      maxRetries: options.maxRetries || 3,
      enableLogging: options.enableLogging ?? true
    };

    this.crawler = new SiteCrawler({
      userAgent: 'ThreadsteadBot/1.0 (+https://threadstead.com/crawler)',
      timeout: 15000, // 15 seconds for worker
      maxRetries: 2,
      respectRobots: true
    });
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
      errors: []
    };

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
            await this.handleSuccessfulCrawl(queueItem, result);
            stats.successful++;
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
  private async handleSuccessfulCrawl(queueItem: any, result: CrawlResult): Promise<void> {
    const content = result.content!;

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

      this.log(`✅ Updated site: ${content.title} (${result.url})`);
    } else {
      this.log(`⚠️ Site not found in index: ${result.url}`);
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
   * Queue discovered links for crawling if they're not already indexed or queued
   */
  private async queueDiscoveredLinks(links: string[]): Promise<void> {
    if (links.length === 0) return;

    // Filter out links that are already indexed or in the crawl queue
    const existingUrls = await db.indexedSite.findMany({
      where: { url: { in: links } },
      select: { url: true }
    });

    const queuedUrls = await db.crawlQueue.findMany({
      where: { url: { in: links } },
      select: { url: true }
    });

    const existingUrlSet = new Set([
      ...existingUrls.map(site => site.url),
      ...queuedUrls.map(item => item.url)
    ]);

    const newLinks = links.filter(link => !existingUrlSet.has(link));

    if (newLinks.length === 0) {
      this.log(`No new links to queue (${links.length} links already known)`);
      return;
    }

    // Add new links to crawl queue with low priority
    const queueItems = newLinks.map(url => ({
      url,
      priority: 2, // Lower priority than manually submitted sites
      scheduledFor: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000), // Random delay within 24 hours
    }));

    await db.crawlQueue.createMany({
      data: queueItems,
      skipDuplicates: true
    });

    this.log(`🔗 Queued ${newLinks.length} discovered links for crawling (${links.length - newLinks.length} already known)`);
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