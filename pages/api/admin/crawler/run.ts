/**
 * API endpoint to manually trigger crawler
 * Admin-only endpoint for running the crawler worker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { CrawlerWorker } from '@/lib/crawler/crawler-worker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication - either session or API key
    let isAuthorized = false;
    let userIdentifier = 'unknown';

    // Option 1: Check for API key authentication
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    const validApiKey = process.env.CRAWLER_API_KEY;

    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true;
      userIdentifier = 'api-key';
    } else {
      // Option 2: Check session-based admin authentication
      const user = await getSessionUser(req as any);
      if (user && user.role === 'admin') {
        isAuthorized = true;
        userIdentifier = user.primaryHandle;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Admin access required' });
    }

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