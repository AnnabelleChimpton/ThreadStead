/**
 * API endpoint for finding similar sites
 * Enhanced version with multiple similarity algorithms
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { SiteRelationshipMapper } from '@/lib/community-index/discovery/relationship-mapper';
import { db } from '@/lib/config/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { site, algorithm = 'hybrid', limit = '10' } = req.query;

    if (!site) {
      return res.status(400).json({ error: 'Site parameter is required' });
    }

    const siteUrl = site as string;
    const limitNum = parseInt(limit as string) || 10;

    let similarSites = [];

    switch (algorithm) {
      case 'relationship':
        similarSites = await findSimilarByRelationships(siteUrl, limitNum);
        break;

      case 'category':
        similarSites = await findSimilarByCategory(siteUrl, limitNum);
        break;

      case 'discovery_patterns':
        similarSites = await findSimilarByDiscoveryPatterns(siteUrl, limitNum);
        break;

      case 'user_behavior':
        similarSites = await findSimilarByUserBehavior(siteUrl, limitNum);
        break;

      case 'hybrid':
      default:
        similarSites = await findSimilarHybrid(siteUrl, limitNum);
        break;
    }

    return res.json({
      success: true,
      algorithm: algorithm,
      site: siteUrl,
      similarSites
    });

  } catch (error) {
    console.error('Similar sites API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Find similar sites using relationship mapping
 */
async function findSimilarByRelationships(siteUrl: string, limit: number) {
  const mapper = new SiteRelationshipMapper();
  return await mapper.findSimilarSites(siteUrl, limit);
}

/**
 * Find similar sites by category and tags
 */
async function findSimilarByCategory(siteUrl: string, limit: number) {
  // Get the target site's info
  const targetSite = await db.indexedSite.findUnique({
    where: { url: siteUrl },
    include: {
      tags: true
    }
  });

  if (!targetSite) {
    return [];
  }

  const targetTags = targetSite.tags.map(t => t.tag);

  // Find sites with same category or shared tags
  const candidates = await db.indexedSite.findMany({
    where: {
      AND: [
        { url: { not: siteUrl } },
        { communityValidated: true },
        {
          OR: [
            { siteType: targetSite.siteType },
            {
              tags: {
                some: {
                  tag: { in: targetTags }
                }
              }
            }
          ]
        }
      ]
    },
    include: {
      tags: true
    },
    take: limit * 2 // Get more to calculate similarity
  });

  // Calculate similarity scores
  const scored = candidates.map(site => {
    let score = 0;
    const reasons = [];

    // Category match
    if (site.siteType === targetSite.siteType) {
      score += 30;
      reasons.push(`same category (${site.siteType})`);
    }

    // Tag matches
    const siteTags = site.tags.map(t => t.tag);
    const sharedTags = targetTags.filter(tag => siteTags.includes(tag));
    if (sharedTags.length > 0) {
      score += sharedTags.length * 10;
      reasons.push(`${sharedTags.length} shared tags`);
    }

    // Community score similarity
    const scoreDiff = Math.abs(site.communityScore - targetSite.communityScore);
    if (scoreDiff < 5) {
      score += 10;
      reasons.push('similar community rating');
    }

    return {
      url: site.url,
      title: site.title,
      similarity: score,
      reasons
    };
  });

  return scored
    .filter(s => s.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Find similar sites by discovery patterns
 */
async function findSimilarByDiscoveryPatterns(siteUrl: string, limit: number) {
  // Get discovery patterns for the target site
  const targetPaths = await db.discoveryPath.findMany({
    where: {
      OR: [
        { fromSite: siteUrl },
        { toSite: siteUrl }
      ]
    },
    take: 100
  });

  if (targetPaths.length === 0) {
    return [];
  }

  // Find sites with similar discovery patterns
  const targetMethods = Array.from(new Set(targetPaths.map(p => p.discoveryMethod)));
  const targetFromSites = Array.from(new Set(targetPaths.map(p => p.fromSite).filter(Boolean))) as string[];

  const similarPaths = await db.discoveryPath.findMany({
    where: {
      toSite: { not: siteUrl },
      OR: [
        { discoveryMethod: { in: targetMethods } },
        { fromSite: { in: targetFromSites } }
      ]
    },
    take: 500
  });

  // Group by site and calculate similarity
  const siteScores = new Map<string, { score: number; reasons: string[] }>();

  for (const path of similarPaths) {
    const site = path.toSite;
    if (!siteScores.has(site)) {
      siteScores.set(site, { score: 0, reasons: [] });
    }

    const data = siteScores.get(site)!;

    // Same discovery method
    if (targetMethods.includes(path.discoveryMethod)) {
      data.score += 5;
      if (!data.reasons.includes(`discovered via ${path.discoveryMethod}`)) {
        data.reasons.push(`discovered via ${path.discoveryMethod}`);
      }
    }

    // Same source site
    if (path.fromSite && targetFromSites.includes(path.fromSite)) {
      data.score += 8;
      if (!data.reasons.includes('linked from same sites')) {
        data.reasons.push('linked from same sites');
      }
    }
  }

  // Get site details and return results
  const siteUrls = Array.from(siteScores.keys()).slice(0, limit * 2);
  const sites = await db.indexedSite.findMany({
    where: {
      url: { in: siteUrls },
      communityValidated: true
    }
  });

  return sites
    .map(site => ({
      url: site.url,
      title: site.title,
      similarity: siteScores.get(site.url)?.score || 0,
      reasons: siteScores.get(site.url)?.reasons || []
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Find similar sites by user behavior patterns
 */
async function findSimilarByUserBehavior(siteUrl: string, limit: number) {
  // Get users who interacted with the target site
  const targetUsers = await db.siteVote.findMany({
    where: { site: { url: siteUrl } },
    select: { userId: true, voteType: true }
  });

  if (targetUsers.length === 0) {
    return [];
  }

  const userIds = targetUsers.map(u => u.userId);
  const positiveUsers = targetUsers
    .filter(u => ['approve', 'quality', 'interesting', 'helpful'].includes(u.voteType))
    .map(u => u.userId);

  // Find other sites these users liked
  const otherVotes = await db.siteVote.findMany({
    where: {
      userId: { in: positiveUsers },
      voteType: { in: ['approve', 'quality', 'interesting', 'helpful'] },
      site: {
        url: { not: siteUrl },
        communityValidated: true
      }
    },
    include: { site: true }
  });

  // Calculate similarity based on user overlap
  const siteScores = new Map<string, { score: number; users: Set<string>; reasons: string[] }>();

  for (const vote of otherVotes) {
    const site = vote.site.url;
    if (!siteScores.has(site)) {
      siteScores.set(site, { score: 0, users: new Set(), reasons: [] });
    }

    const data = siteScores.get(site)!;
    data.users.add(vote.userId);
    data.score += 1;
  }

  // Convert to results
  return Array.from(siteScores.entries())
    .map(([url, data]) => {
      const site = otherVotes.find(v => v.site.url === url)?.site;
      const userOverlap = data.users.size;
      const similarity = (userOverlap / positiveUsers.length) * 100;

      return {
        url,
        title: site?.title,
        similarity,
        reasons: [`liked by ${userOverlap} of the same users`]
      };
    })
    .filter(s => s.similarity > 10) // At least 10% user overlap
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Hybrid approach combining multiple algorithms
 */
async function findSimilarHybrid(siteUrl: string, limit: number) {
  // Run multiple algorithms
  const [
    relationshipResults,
    categoryResults,
    discoveryResults,
    userResults
  ] = await Promise.all([
    findSimilarByRelationships(siteUrl, limit),
    findSimilarByCategory(siteUrl, limit),
    findSimilarByDiscoveryPatterns(siteUrl, limit),
    findSimilarByUserBehavior(siteUrl, limit)
  ]);

  // Combine and weight results
  const combinedScores = new Map<string, {
    url: string;
    title?: string;
    totalScore: number;
    algorithms: string[];
    reasons: string[];
  }>();

  const weights = {
    relationship: 0.3,
    category: 0.25,
    discovery: 0.25,
    user: 0.2
  };

  // Process each algorithm's results
  for (const [results, weight, algorithmName] of [
    [relationshipResults, weights.relationship, 'relationship'],
    [categoryResults, weights.category, 'category'],
    [discoveryResults, weights.discovery, 'discovery'],
    [userResults, weights.user, 'user']
  ] as const) {
    for (const result of results) {
      if (!combinedScores.has(result.url)) {
        combinedScores.set(result.url, {
          url: result.url,
          title: result.title,
          totalScore: 0,
          algorithms: [],
          reasons: []
        });
      }

      const data = combinedScores.get(result.url)!;
      data.totalScore += result.similarity * weight;
      data.algorithms.push(algorithmName);
      if (result.reasons) {
        data.reasons.push(...result.reasons);
      }
    }
  }

  // Return top results
  return Array.from(combinedScores.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map(result => ({
      url: result.url,
      title: result.title,
      similarity: Math.round(result.totalScore),
      reasons: Array.from(new Set(result.reasons)).slice(0, 3) // Dedupe and limit reasons
    }));
}