/**
 * API endpoint to manually trigger crawler
 * Admin-only endpoint for running the crawler worker
 */

import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
import { apiHandler } from '@/lib/api/handler';
import { getServerEnv } from '@/lib/config/env';

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'admin',
    rateLimit: 'admin',
    // scripts/run-crawler.sh authenticates with this instead of a session
    apiKey: () => getServerEnv().CRAWLER_API_KEY,
  },
  async (req, res, { user, viaApiKey }) => {
    try {
      const userIdentifier = viaApiKey ? 'api-key' : user?.primaryHandle || user?.id || 'admin-user';

      const {
        batchSize = 10,
        concurrency = 3
      } = req.body;

      console.log('🕷️ Manual crawler run triggered by', userIdentifier);

      // Create crawler worker
      const worker = new CrawlerWorker({
        batchSize: Math.min(batchSize, 50), // Cap at 50 for safety
        concurrency: Math.min(concurrency, 5), // Cap at 5 for safety
        enableLogging: true
      });

      // Get queue stats before
      const statsBefore = await worker.getQueueStats();

      // Process the queue
      const crawlStats = await worker.processPendingQueue();

      // Get queue stats after
      const statsAfter = await worker.getQueueStats();

      return res.json({
        success: true,
        message: 'Crawler run completed',
        crawlStats,
        queueStats: {
          before: statsBefore,
          after: statsAfter
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
