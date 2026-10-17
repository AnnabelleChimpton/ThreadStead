/**
 * API endpoint to clean up old completed crawler items
 * Admin-only endpoint for database maintenance
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
      const { olderThanDays = 30 } = req.body;

      // Validate input
      const days = Math.max(7, Math.min(365, parseInt(olderThanDays))); // Clamp 7-365 days

      const worker = new CrawlerWorker({ enableLogging: true });
      const deletedCount = await worker.cleanupOldItems(days);

      return res.json({
        success: true,
        deletedCount,
        olderThanDays: days,
        message: `Cleaned up ${deletedCount} completed items older than ${days} days`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler cleanup API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
