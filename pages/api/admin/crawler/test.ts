/**
 * API endpoint to test crawl a single URL
 * Returns detailed extraction and quality assessment without affecting the queue
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
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const worker = new CrawlerWorker({ enableLogging: true });
      const result = await worker.testCrawlUrl(url);

      return res.json({
        success: true,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Crawler test API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
