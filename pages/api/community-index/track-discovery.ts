/**
 * API endpoint for tracking discovery events
 * Called when users navigate to indexed sites
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { DiscoveryPathTracker } from '@/lib/community-index/discovery/path-tracker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication (optional - track anonymous users too)
    const user = await getSessionUser(req as any);

    // Allow anonymous tracking with fallback
    const userId = user?.id || `anonymous_${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'}`;

    const {
      fromSite,
      toSite,
      discoveryMethod,
      sessionId,
      metadata
    } = req.body;

    // Validate required fields
    if (!toSite || !discoveryMethod) {
      return res.status(400).json({
        error: 'toSite and discoveryMethod are required'
      });
    }

    // Validate discovery method
    const validMethods = [
      'link_click',
      'search_result',
      'webring',
      'random',
      'surprise',
      'validation',
      'direct',
      'recommendation',
      'discovery_feed'
    ];

    if (!validMethods.includes(discoveryMethod)) {
      return res.status(400).json({
        error: 'Invalid discovery method'
      });
    }

    // Track the discovery
    const tracker = new DiscoveryPathTracker();
    await tracker.trackDiscovery({
      fromSite,
      toSite,
      discoveredBy: userId,
      discoveryMethod,
      sessionId,
      metadata
    });

    return res.json({
      success: true,
      message: 'Discovery tracked successfully'
    });

  } catch (error) {
    console.error('Discovery tracking error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}