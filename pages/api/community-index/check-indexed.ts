/**
 * API endpoint to check if a site is in our community index
 * Used by client-side discovery tracker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Normalize URL to check against our index
    const normalizedUrl = url.toLowerCase().replace(/\/$/, '');

    // Check if site exists in our index
    const indexedSite = await db.indexedSite.findFirst({
      where: {
        OR: [
          { url: normalizedUrl },
          { url: `${normalizedUrl}/` },
          { url: url },
          { url: `${url}/` }
        ],
        // Only return sites that are validated or pending validation
        // (Don't track navigation to rejected sites)
        communityValidated: {
          not: false
        }
      },
      select: {
        id: true,
        url: true,
        title: true,
        communityValidated: true
      }
    });

    return res.json({
      indexed: !!indexedSite,
      site: indexedSite ? {
        id: indexedSite.id,
        url: indexedSite.url,
        title: indexedSite.title,
        validated: indexedSite.communityValidated
      } : null
    });

  } catch (error) {
    console.error('Check indexed site error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}