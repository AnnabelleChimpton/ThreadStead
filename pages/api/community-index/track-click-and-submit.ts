/**
 * API endpoint for tracking clicks on external search results and auto-submitting to community index
 * This creates organic growth by adding clicked sites to our index
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { DiscoveryPathTracker } from '@/lib/community-index/discovery/path-tracker';
import { SeedingFilter } from '@/lib/community-index/seeding/quality-filter';
import type { ExtSearchResultItem } from '@/lib/extsearch/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication (optional - allow anonymous tracking)
    const user = await getSessionUser(req as any);
    const userId = user?.id || `anonymous_${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'}`;

    const {
      result, // The ExtSearchResultItem that was clicked
      searchQuery,
      searchTab,
      sessionId
    } = req.body;

    // Validate required fields
    if (!result?.url) {
      return res.status(400).json({
        error: 'result.url is required'
      });
    }

    // Track the click discovery
    const tracker = new DiscoveryPathTracker();
    await tracker.trackDiscovery({
      fromSite: req.headers.origin || 'threadstead',
      toSite: result.url,
      discoveredBy: userId,
      discoveryMethod: 'search_result',
      sessionId,
      metadata: {
        searchQuery,
        searchTab,
        engine: result.engine,
        isIndieWeb: result.isIndieWeb,
        privacyScore: result.privacyScore
      }
    });

    // Check if site is already indexed
    const existingSite = await db.indexedSite.findUnique({
      where: { url: result.url }
    });

    let submissionResult = null;

    if (!existingSite) {
      // Site not in index - evaluate and potentially add it
      const filter = new SeedingFilter();
      const evaluation = await filter.evaluateSite(result);

      // Only submit sites that meet basic quality threshold
      if (evaluation.shouldSeed && evaluation.score >= 35) {
        // Determine auto-validation based on same logic as seeding
        const shouldAutoValidate = shouldAutoValidateClickedSite(evaluation, result);
        const initialCommunityScore = shouldAutoValidate ? Math.floor(evaluation.score / 10) : 0;

        // Extract keywords from title and snippet
        const keywords = extractKeywords(result);

        try {
          // Add to community index
          const indexedSite = await db.indexedSite.create({
            data: {
              url: result.url,
              title: result.title,
              description: result.snippet || `Discovered through search: "${searchQuery}"`,
              discoveryMethod: 'user_click',
              discoveryContext: searchQuery || 'search',
              siteType: evaluation.suggestedCategory,
              seedingScore: evaluation.score,
              seedingReasons: evaluation.reasons,
              communityValidated: shouldAutoValidate,
              communityScore: initialCommunityScore,
              extractedKeywords: keywords,
              sslEnabled: result.url.startsWith('https://'),
              crawlStatus: 'pending',
              submittedBy: user?.id // Track who clicked it if logged in
            }
          });

          // Add to crawl queue for full analysis
          await db.crawlQueue.create({
            data: {
              url: result.url,
              priority: evaluation.priority,
              scheduledFor: new Date()
            }
          });

          submissionResult = {
            action: 'submitted',
            siteId: indexedSite.id,
            score: evaluation.score,
            autoValidated: shouldAutoValidate,
            reasons: evaluation.reasons
          };
        } catch (error) {
          console.error('Failed to auto-submit clicked site:', error);
          submissionResult = {
            action: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      } else {
        submissionResult = {
          action: 'skipped',
          reason: 'Quality threshold not met',
          score: evaluation.score,
          shouldSeed: evaluation.shouldSeed
        };
      }
    } else {
      submissionResult = {
        action: 'already_indexed',
        siteId: existingSite.id
      };
    }

    return res.json({
      success: true,
      message: 'Click tracked successfully',
      submission: submissionResult
    });

  } catch (error) {
    console.error('Click tracking and submission error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Determine if a clicked site should be auto-validated
 * Uses same logic as seeding but slightly more permissive since it was user-selected
 */
function shouldAutoValidateClickedSite(evaluation: any, result: ExtSearchResultItem): boolean {
  // Slightly more permissive thresholds for user-clicked sites
  const HIGH_SCORE_THRESHOLD = 50; // Lower than seeding (55) since user showed interest
  const MIN_CONFIDENCE = 0.6;

  // Must meet score threshold
  if (evaluation.score < HIGH_SCORE_THRESHOLD) {
    return false;
  }

  // Must have high confidence in the evaluation
  if (evaluation.confidence < MIN_CONFIDENCE) {
    return false;
  }

  // Check for strong positive indicators
  const strongIndicators = [
    'indie_web_detected',
    'indie_web_domain',
    'personal_domain',
    'privacy_friendly',
    'no_trackers',
    'personal_content',
    'creative_content',
    'technical_content'
  ];

  const hasStrongIndicators = strongIndicators.some(indicator =>
    evaluation.reasons.includes(indicator)
  );

  // Check for seriously negative indicators
  const blockingIndicators = [
    'big_tech_domain',
    'spam_indicators',
    'parked_domain'
  ];

  const hasBlockingIndicators = blockingIndicators.some(indicator =>
    evaluation.reasons.includes(indicator)
  );

  if (hasBlockingIndicators) {
    return false;
  }

  // If no strong indicators but score is high enough, still consider auto-validation
  if (!hasStrongIndicators && evaluation.score < 70) {
    return false;
  }

  // Privacy requirements (lenient)
  if (result.privacyScore !== undefined && result.privacyScore < 0.4) {
    return false;
  }

  // Allow sites with trackers if they have other strong indicators
  if (result.hasTrackers === true && !hasStrongIndicators) {
    return false;
  }

  return true; // All checks passed - auto-validate
}

/**
 * Extract basic keywords from search result
 */
function extractKeywords(result: ExtSearchResultItem): string[] {
  const text = `${result.title} ${result.snippet || ''}`.toLowerCase();
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 10); // Limit to 10 keywords

  return [...new Set(words)]; // Remove duplicates
}