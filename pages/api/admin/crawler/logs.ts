/**
 * API endpoint to get crawler activity logs
 * Admin-only endpoint for monitoring recent crawl activity
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { CrawlerWorker } from '@/lib/crawler/crawler-worker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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
