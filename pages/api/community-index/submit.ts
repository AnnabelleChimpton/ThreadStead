/**
 * API for community site submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { SiteType } from '@/lib/community-index/seeding/discovery-queries';
import { QualityAssessor } from '@/lib/crawler/quality-assessor';
import { ContentExtractor } from '@/lib/crawler/content-extractor';

const assessor = new QualityAssessor();
const extractor = new ContentExtractor();

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
        // If it exists but wasn't submitted by a user, we could potentially update the "discovered by" 
        // if we wanted to be generous, but for now just return success to not discourage the user.
        // We can tell them "Good eye! This one is already in our collection."
        return res.status(200).json({
          success: true,
          message: 'Good eye! This site is already in our index.',
          site: existing,
          isDuplicate: true
        });
      }

      // Try to fetch and assess quality immediately
      let communityValidated = false;
      let communityScore = 0;
      let assessedSiteType = category || SiteType.OTHER;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ThreadStead-QualityCheck/1.0'
          }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const html = await response.text();
          const content = await extractor.extractFromHtml(html, url);

          // Assess quality with user submission bonus (+30 points)
          const assessment = assessor.assessQuality(content, url, true);

          if (assessment.shouldAutoSubmit) {
            communityValidated = true;
            communityScore = assessment.totalScore;
            assessedSiteType = assessment.category || assessedSiteType;
          }
        }
      } catch (error) {
        // If quality assessment fails, just continue with manual validation
        console.log('Quality assessment failed for submission, will require manual validation:', error);
      }

      // Create the indexed site
      const indexedSite = await db.indexedSite.create({
        data: {
          url,
          title,
          description,
          submittedBy: user.id, // CRITICAL: Attribute to user for "Discovered By" credit
          discoveryMethod: 'manual',
          discoveryContext: discoveryContext || 'User submission',
          siteType: assessedSiteType,
          extractedKeywords: tags || [],
          sslEnabled: url.startsWith('https://'),
          crawlStatus: communityValidated ? 'success' : 'pending',
          communityValidated,
          communityScore,
          indexingPurpose: communityValidated ? 'full_index' : 'pending_review'
        }
      });

      // Add to crawl queue for full analysis - PRIORITY 1 (Highest)
      await db.crawlQueue.create({
        data: {
          url,
          priority: 1, // Highest priority for user submissions!
          scheduledFor: new Date()
        }
      });

      // TODO: Award "Scout Points" to user here
      // await awardScoutPoints(user.id, 50);

      return res.json({
        success: true,
        message: communityValidated
          ? 'Site submitted and auto-validated! It\'s now live in the index.'
          : 'Site submitted successfully and queued for validation',
        site: indexedSite,
        autoValidated: communityValidated
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