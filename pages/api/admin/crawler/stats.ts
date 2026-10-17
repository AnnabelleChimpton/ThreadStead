/**
 * API endpoint to get crawler statistics
 * Admin-only endpoint for monitoring crawler health
 */

import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
import { apiHandler } from '@/lib/api/handler';
import { getServerEnv } from '@/lib/config/env';

export default apiHandler(
  {
    methods: ['GET'],
    auth: 'admin',
    apiKey: () => getServerEnv().CRAWLER_API_KEY,
  },
  async (req, res) => {
    try {
      const worker = new CrawlerWorker();
      const queueStats = await worker.getQueueStats();

      return res.json({
        success: true,
        queueStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler stats API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
