/**
 * API endpoint to get crawler activity logs
 * Admin-only endpoint for monitoring recent crawl activity
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
      const { limit = '50', status } = req.query;

      const worker = new CrawlerWorker({ enableLogging: false });
      const logs = await worker.getRecentActivity(
        parseInt(limit as string),
        status as string | undefined
      );

      return res.json({
        success: true,
        logs,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler logs API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
