/**
 * API endpoint to manage crawler queue
 * GET: Fetch queue items with pagination and filters
 * POST: Add new URL to queue
 */

import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
import { apiHandler } from '@/lib/api/handler';
import { getServerEnv } from '@/lib/config/env';
import { parsePagePagination } from '@/lib/server/http/pagination';

export default apiHandler(
  {
    methods: ['GET', 'POST'],
    auth: 'admin',
    rateLimit: 'admin',
    apiKey: () => getServerEnv().CRAWLER_API_KEY,
  },
  async (req, res) => {
    try {
      const worker = new CrawlerWorker({ enableLogging: false });

      if (req.method === 'GET') {
        // Get queue items with pagination and filters
        const {
          status,
          search,
          sortBy = 'scheduledFor',
          sortOrder = 'asc'
        } = req.query;

        const { page, limit } = parsePagePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
        const result = await worker.getQueueItems({
          status: status as string | undefined,
          page,
          limit,
          search: search as string | undefined,
          sortBy: sortBy as 'priority' | 'scheduledFor' | 'attempts',
          sortOrder: sortOrder as 'asc' | 'desc'
        });

        return res.json({
          success: true,
          ...result
        });

      } else if (req.method === 'POST') {
        // Add new URL to queue
        const { url, priority = 3, scheduledFor, extractAllLinks = false } = req.body;

        if (!url) {
          return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL format
        try {
          new URL(url);
        } catch {
          return res.status(400).json({ error: 'Invalid URL format' });
        }

        const result = await worker.addToQueue(
          url,
          priority,
          scheduledFor ? new Date(scheduledFor) : undefined,
          extractAllLinks
        );

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.json({
          success: true,
          id: result.id,
          message: 'URL added to crawl queue'
        });
      }

    } catch (error) {
      console.error('Crawler queue API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
