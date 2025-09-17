/**
 * API for community site submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { SiteType } from '@/lib/community-index/seeding/discovery-queries';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const user = await getSessionUser(req as any);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'POST') {
      const {
        url,
        title,
        description,
        category,
        tags,
        discoveryContext
      } = req.body;

      // Validate required fields
      if (!url || !title || !description) {
        return res.status(400).json({
          error: 'URL, title, and description are required'
        });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      // Check for duplicates
      const existing = await db.indexedSite.findUnique({
        where: { url }
      });

      if (existing) {
        return res.status(409).json({
          error: 'This site is already in the index',
          existingSite: existing
        });
      }

      // Create the indexed site
      const indexedSite = await db.indexedSite.create({
        data: {
          url,
          title,
          description,
          submittedBy: user.id,
          discoveryMethod: 'manual',
          discoveryContext: discoveryContext || 'User submission',
          siteType: category || SiteType.OTHER,
          extractedKeywords: tags || [],
          sslEnabled: url.startsWith('https://'),
          crawlStatus: 'pending',
          communityValidated: false // Community submissions also need validation
        }
      });

      // Add to crawl queue for full analysis
      await db.crawlQueue.create({
        data: {
          url,
          priority: 3, // Medium priority for manual submissions
          scheduledFor: new Date()
        }
      });

      return res.json({
        success: true,
        message: 'Site submitted successfully and queued for validation',
        site: indexedSite
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Site submission error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}