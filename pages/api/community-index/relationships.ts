/**
 * API endpoint for site relationship data
 * Provides relationship insights and similar site recommendations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { SiteRelationshipMapper } from '@/lib/community-index/discovery/relationship-mapper';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mapper = new SiteRelationshipMapper();
    const { action, site, limit } = req.query;

    switch (action) {
      case 'insights':
        if (!site) {
          return res.status(400).json({ error: 'Site parameter required for insights' });
        }

        const insights = await mapper.getSiteRelationships(
          site as string,
          parseInt(limit as string) || 20
        );

        return res.json({
          success: true,
          insights
        });

      case 'similar':
        if (!site) {
          return res.status(400).json({ error: 'Site parameter required for similar sites' });
        }

        const similarSites = await mapper.findSimilarSites(
          site as string,
          parseInt(limit as string) || 10
        );

        return res.json({
          success: true,
          similarSites
        });

      case 'trending':
        const days = parseInt(req.query.days as string) || 7;
        const patterns = await mapper.getTrendingPatterns(days);

        return res.json({
          success: true,
          patterns
        });

      case 'build':
        // Admin endpoint to rebuild relationships
        const lookbackDays = parseInt(req.query.lookbackDays as string) || 30;
        await mapper.buildRelationships(lookbackDays);

        return res.json({
          success: true,
          message: `Relationships rebuilt using last ${lookbackDays} days of data`
        });

      default:
        return res.status(400).json({
          error: 'Invalid action. Use: insights, similar, trending, or build'
        });
    }

  } catch (error) {
    console.error('Relationships API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}