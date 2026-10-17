/**
 * API endpoint to run a specific queue item immediately
 * Updates scheduledFor to NOW and crawls the item
 */

import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { getServerEnv } from '@/lib/config/env';

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'admin',
    rateLimit: 'admin',
    apiKey: () => getServerEnv().CRAWLER_API_KEY,
  },
  async (req, res) => {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Queue item ID is required' });
      }

      // Get the queue item
      const queueItem = await db.crawlQueue.findUnique({
        where: { id }
      });

      if (!queueItem) {
        return res.status(404).json({ error: 'Queue item not found' });
      }

      if (queueItem.status !== 'pending') {
        return res.status(400).json({ error: `Cannot run item with status: ${queueItem.status}` });
      }

      // Update scheduledFor to NOW so it will be picked up
      await db.crawlQueue.update({
        where: { id },
        data: { scheduledFor: new Date() }
      });

      // Create crawler worker with batch size 1 to only process this item
      const worker = new CrawlerWorker({
        batchSize: 1,
        enableLogging: true
      });

      // Process the queue (will pick up our just-updated item)
      const crawlStats = await worker.processPendingQueue();

      // Get the detailed result for this specific item
      const detailedResult = crawlStats.detailedResults.find(r => r.url === queueItem.url);

      return res.json({
        success: true,
        message: 'Item crawled successfully',
        crawlStats,
        detailedResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler run-item API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
