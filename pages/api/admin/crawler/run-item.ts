/**
 * API endpoint to run a specific queue item immediately
 * Updates scheduledFor to NOW and crawls the item
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
import { db } from '@/lib/config/database/connection';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
