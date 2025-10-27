/**
 * API endpoint to clean up old completed crawler items
 * Admin-only endpoint for database maintenance
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { CrawlerWorker } from '@/lib/crawler/crawler-worker';
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

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
