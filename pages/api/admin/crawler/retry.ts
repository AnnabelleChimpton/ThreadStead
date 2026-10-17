/**
 * API endpoint to retry failed crawler items
 * Admin-only endpoint for retrying all failed crawl attempts
 */

import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
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
      const worker = new CrawlerWorker({ enableLogging: true });
      const result = await worker.retryFailedItems();

      if (!result.success) {
        return res.status(500).json({
          error: 'Failed to retry items',
          message: result.error
        });
      }

      return res.json({
        success: true,
        retriedCount: result.retriedCount,
        message: `Successfully reset ${result.retriedCount} failed items to pending status`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler retry API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
