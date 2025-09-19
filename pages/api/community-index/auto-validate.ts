/**
 * Auto-validation API for crawler submissions
 * Automatically approves/rejects sites based on quality scores
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { force = false } = req.body;

    // Get all pending crawler submissions
    const pendingSites = await db.indexedSite.findMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false
      },
      orderBy: {
        discoveredAt: 'asc'
      }
    });

    console.log(`Found ${pendingSites.length} pending crawler submissions`);

    let approved = 0;
    let rejected = 0;
    let skipped = 0;

    for (const site of pendingSites) {
      const result = await autoValidateSite(site, force);

      switch (result.action) {
        case 'approve':
          approved++;
          break;
        case 'reject':
          rejected++;
          break;
        case 'skip':
          skipped++;
          break;
      }
    }

    return res.json({
      success: true,
      processed: pendingSites.length,
      results: {
        approved,
        rejected,
        skipped
      }
    });

  } catch (error) {
    console.error('Auto-validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function autoValidateSite(site: any, force: boolean) {
  const score = site.seedingScore || 0;

  // Phase 2 aligned thresholds - consistent across all systems
  const AUTO_APPROVE_THRESHOLD = 75; // High confidence sites (Phase 2 standard)
  const AUTO_REJECT_THRESHOLD = 30;  // Clear low-quality sites (Phase 2 standard)

  // Note: Sites need 40+ to be added by crawler/seeding, then 75+ to auto-approve

  // Quality indicators for scoring
  let qualityBonus = 0;

  // IndieWeb sites get bonus points
  if (site.url && isIndieWebDomain(site.url)) {
    qualityBonus += 15;
  }

  // Sites with good metadata get bonus
  if (site.title && site.description && site.title.length > 10 && site.description.length > 20) {
    qualityBonus += 10;
  }

  // Personal domains get bonus
  if (site.url && isPersonalDomain(site.url)) {
    qualityBonus += 10;
  }

  const finalScore = score + qualityBonus;

  if (finalScore >= AUTO_APPROVE_THRESHOLD || force) {
    // Auto-approve high quality sites
    await db.indexedSite.update({
      where: { id: site.id },
      data: {
        communityValidated: true,
        communityScore: Math.max(finalScore, 10), // Minimum score for approved sites
        validationVotes: 0, // No human votes needed
        autoValidated: true,
        autoValidatedAt: new Date(),
        autoValidationScore: finalScore
      }
    });

    console.log(`Auto-approved: ${site.title} (score: ${finalScore})`);
    return { action: 'approve', score: finalScore };

  } else if (finalScore <= AUTO_REJECT_THRESHOLD) {
    // Auto-reject clearly low quality sites
    await db.indexedSite.delete({
      where: { id: site.id }
    });

    console.log(`Auto-rejected: ${site.title} (score: ${finalScore})`);
    return { action: 'reject', score: finalScore };

  } else {
    // Keep in limbo for manual review later if needed
    console.log(`Skipped: ${site.title} (score: ${finalScore}) - needs manual review`);
    return { action: 'skip', score: finalScore };
  }
}

function isIndieWebDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();

    // Common indie web indicators
    const indieIndicators = [
      '.dev', '.me', '.io', '.xyz', '.club', '.site', '.blog',
      'bearblog.dev', 'github.io', 'gitlab.io', 'netlify.app',
      'vercel.app', 'neocities.org', 'tilde.', '~'
    ];

    // Commercial domains to avoid
    const commercialDomains = [
      'amazon.', 'google.', 'facebook.', 'twitter.', 'youtube.',
      'instagram.', 'linkedin.', 'medium.com', 'wordpress.com',
      'blogger.com', 'tumblr.com', 'wix.com', 'squarespace.com'
    ];

    // Check for commercial domains (negative indicator)
    if (commercialDomains.some(commercial => domain.includes(commercial))) {
      return false;
    }

    // Check for indie indicators (positive indicator)
    return indieIndicators.some(indicator => domain.includes(indicator));

  } catch {
    return false;
  }
}

function isPersonalDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();

    // Looks like a personal domain (name-based)
    const personalPatterns = [
      /^[a-z]+\.[a-z]+\.(dev|me|io|com|net|org)$/,  // firstname.lastname.tld
      /^[a-z]+\.dev$/,                               // name.dev
      /^[a-z]+\.me$/,                                // name.me
      /^[a-z]+[0-9]*\.(io|xyz|club|site)$/          // name123.io
    ];

    return personalPatterns.some(pattern => pattern.test(domain));

  } catch {
    return false;
  }
}