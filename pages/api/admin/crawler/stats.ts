/**
 * API endpoint to get crawler statistics
 * Admin-only endpoint for monitoring crawler health
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
    // Check admin authentication
    const user = await getSessionUser(req as any);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

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