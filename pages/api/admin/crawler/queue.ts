/**
 * API endpoint to manage crawler queue
 * GET: Fetch queue items with pagination and filters
 * POST: Add new URL to queue
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { CrawlerWorker } from '@/lib/crawler/crawler-worker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication - either session or API key
    let isAuthorized = false;

    // Option 1: Check for API key authentication
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    const validApiKey = process.env.CRAWLER_API_KEY;

    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true;
    } else {
      // Option 2: Check session-based admin authentication
      const user = await getSessionUser(req as any);
      if (user && user.role === 'admin') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const worker = new CrawlerWorker({ enableLogging: false });

    if (req.method === 'GET') {
      // Get queue items with pagination and filters
      const {
        status,
        page = '1',
        limit = '50',
        search,
        sortBy = 'scheduledFor',
        sortOrder = 'asc'
      } = req.query;

      const result = await worker.getQueueItems({
        status: status as string | undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
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

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Crawler queue API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
