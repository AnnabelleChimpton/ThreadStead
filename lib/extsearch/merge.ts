/**
 * Merge Utilities
 * Functions for normalizing, deduplicating, and ranking search results
 */

import type { ExtSearchResultItem, NormalizedUrl } from './types';

/**
 * Normalize a URL for comparison
 * Removes protocol, www, trailing slashes, query params (except important ones), and fragments
 */
export function normalizeUrl(url: string): NormalizedUrl {
  try {
    const parsed = new URL(url);

    // Extract domain without www
    const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();

    // Keep only important query parameters
    const importantParams = ['v', 'id', 'p', 'page']; // YouTube videos, generic IDs, pagination
    const searchParams = new URLSearchParams();

    parsed.searchParams.forEach((value, key) => {
      if (importantParams.includes(key.toLowerCase())) {
        searchParams.set(key, value);
      }
    });

    // Build normalized path
    let path = parsed.pathname.replace(/\/+$/, ''); // Remove trailing slashes
    if (path === '') path = '/';

    // Add important params back
    const paramString = searchParams.toString();
    if (paramString) {
      path += '?' + paramString;
    }

    const normalized = domain + path;

    return {
      original: url,
      normalized,
      domain,
      path
    };
  } catch (error) {
    // If URL parsing fails, return a basic normalization
    const cleaned = url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');

    return {
      original: url,
      normalized: cleaned,
      domain: cleaned.split('/')[0] || cleaned,
      path: '/' + (cleaned.split('/').slice(1).join('/') || '')
    };
  }
}

/**
 * Remove duplicate results based on normalized URLs
 * Keeps the result with the highest score when duplicates are found
 */
export function dedupe(results: ExtSearchResultItem[]): ExtSearchResultItem[] {
  const seen = new Map<string, ExtSearchResultItem>();

  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    const key = normalizedUrl.normalized;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, result);
    } else {
      // Keep the one with higher score, or better metadata
      const existingScore = existing.score ?? 0.5;
      const newScore = result.score ?? 0.5;

      if (newScore > existingScore) {
        seen.set(key, result);
      } else if (newScore === existingScore) {
        // If scores are equal, prefer the one with more metadata
        const existingMetadata = countMetadata(existing);
        const newMetadata = countMetadata(result);

        if (newMetadata > existingMetadata) {
          seen.set(key, result);
        }
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Count non-empty metadata fields for quality comparison
 */
function countMetadata(result: ExtSearchResultItem): number {
  let count = 0;
  if (result.snippet) count++;
  if (result.favicon) count++;
  if (result.publishedDate) count++;
  if (result.privacyScore !== undefined) count++;
  if (result.isIndieWeb !== undefined) count++;
  if (result.contentType && result.contentType !== 'unknown') count++;
  return count;
}

/**
 * Merge and rank results using reciprocal rank fusion
 * This gives better results than simple averaging
 */
export function fuseRank(results: ExtSearchResultItem[]): ExtSearchResultItem[] {
  // Group results by normalized URL
  const urlGroups = new Map<string, ExtSearchResultItem[]>();

  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    const key = normalizedUrl.normalized;

    const group = urlGroups.get(key) || [];
    group.push(result);
    urlGroups.set(key, group);
  }

  // Calculate fused scores
  const fusedResults: Array<{ result: ExtSearchResultItem; fusedScore: number }> = [];

  for (const [_, group] of urlGroups) {
    // Use reciprocal rank fusion formula
    let fusedScore = 0;
    let bestResult = group[0];

    for (const result of group) {
      // RRF score: 1 / (k + rank), where k=60 is a standard constant
      const k = 60;
      const rank = result.position ?? 20; // Default position if not provided
      const rrfScore = 1 / (k + rank);

      // Also factor in the original score if available
      const originalScore = result.score ?? 0.5;
      const combinedScore = (rrfScore * 0.7) + (originalScore * 0.3);

      fusedScore += combinedScore;

      // Keep the result with most metadata
      if (countMetadata(result) > countMetadata(bestResult)) {
        bestResult = result;
      }
    }

    // Average the fused score
    fusedScore = fusedScore / group.length;

    // Boost for appearing in multiple engines
    const engineBoost = Math.log(group.length + 1) * 0.1; // logarithmic boost
    fusedScore += engineBoost;

    // Apply indie web boost
    if (bestResult.isIndieWeb) {
      fusedScore *= 1.3; // 30% boost for indie sites
    }

    // Apply privacy boost
    if (bestResult.privacyScore && bestResult.privacyScore > 0.7) {
      fusedScore *= 1.1; // 10% boost for privacy-respecting sites
    }

    // Penalty for trackers
    if (bestResult.hasTrackers) {
      fusedScore *= 0.9; // 10% penalty
    }

    fusedResults.push({
      result: { ...bestResult, score: fusedScore },
      fusedScore
    });
  }

  // Sort by fused score
  fusedResults.sort((a, b) => b.fusedScore - a.fusedScore);

  return fusedResults.map(item => item.result);
}

/**
 * Balance results to ensure fair representation from each engine
 * Interleaves results from different engines rather than letting one dominate
 */
export function balanceResults(results: ExtSearchResultItem[]): ExtSearchResultItem[] {
  // Group results by engine
  const engineGroups = new Map<string, ExtSearchResultItem[]>();

  for (const result of results) {
    const group = engineGroups.get(result.engine) || [];
    group.push(result);
    engineGroups.set(result.engine, group);
  }

  // Sort each engine's results by score
  for (const [engine, group] of engineGroups) {
    group.sort((a, b) => (b.score ?? 0.5) - (a.score ?? 0.5));
  }

  // Interleave results from engines
  const balanced: ExtSearchResultItem[] = [];
  const engines = Array.from(engineGroups.keys());
  const maxResults = Math.max(...Array.from(engineGroups.values()).map(g => g.length));

  for (let i = 0; i < maxResults; i++) {
    for (const engine of engines) {
      const group = engineGroups.get(engine);
      if (group && group[i]) {
        balanced.push(group[i]);
      }
    }
  }

  return balanced;
}

/**
 * Filter results based on privacy and indie web criteria
 */
export function filterResults(
  results: ExtSearchResultItem[],
  filters?: {
    indieOnly?: boolean;
    privacyOnly?: boolean;
    noTrackers?: boolean;
    contentTypes?: string[];
  }
): ExtSearchResultItem[] {
  if (!filters) return results;

  return results.filter(result => {
    if (filters.indieOnly && !result.isIndieWeb) return false;
    if (filters.privacyOnly && (!result.privacyScore || result.privacyScore < 0.7)) return false;
    if (filters.noTrackers && result.hasTrackers) return false;
    if (filters.contentTypes && filters.contentTypes.length > 0) {
      if (!result.contentType || !filters.contentTypes.includes(result.contentType)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Analyze a domain to determine if it's likely indie/small web
 */
export function analyzeIndieWeb(domain: string): boolean {
  // Common indie web indicators
  const indieIndicators = [
    /\.github\.io$/,
    /\.gitlab\.io$/,
    /\.netlify\.app$/,
    /\.vercel\.app$/,
    /\.surge\.sh$/,
    /\.neocities\.org$/,
    /\.wordpress\.com$/,
    /\.blogspot\.com$/,
    /\.tumblr\.com$/,
    /\.substack\.com$/,
    /\.ghost\.io$/,
    /\.hashnode\.dev$/,
    /\.dev\.to$/,
  ];

  // Check if domain matches indie indicators
  const lowerDomain = domain.toLowerCase();
  for (const pattern of indieIndicators) {
    if (pattern.test(lowerDomain)) {
      return true;
    }
  }

  // Check for personal domains (heuristic: short, no corporate keywords)
  const corporateKeywords = ['corp', 'inc', 'llc', 'ltd', 'company', 'business'];
  const hasCorporateKeyword = corporateKeywords.some(keyword =>
    lowerDomain.includes(keyword)
  );

  if (!hasCorporateKeyword && lowerDomain.split('.').length <= 2) {
    // Could be a personal domain
    return true;
  }

  return false;
}

/**
 * Estimate privacy score based on domain
 */
export function estimatePrivacyScore(domain: string): number {
  // Known privacy-respecting domains
  const privacyGood = [
    'duckduckgo.com',
    'searx.be',
    'qwant.com',
    'mojeek.com',
    'archive.org',
    'eff.org',
    'privacytools.io',
    'signal.org',
  ];

  // Known tracker-heavy domains
  const privacyBad = [
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'amazon.com',
    'google.com',
    'twitter.com',
    'x.com',
  ];

  const lowerDomain = domain.toLowerCase();

  // Check known good sites
  if (privacyGood.some(good => lowerDomain.includes(good))) {
    return 0.9;
  }

  // Check known bad sites
  if (privacyBad.some(bad => lowerDomain.includes(bad))) {
    return 0.2;
  }

  // Default middle score
  return 0.5;
}