/**
 * Boost Utilities
 * Functions for boosting results based on ThreadRing membership and community signals
 */

import type { ExtSearchResultItem } from './types';
import { normalizeUrl } from './merge';

interface RingMember {
  domain: string;
  trustScore?: number;
  isVerified?: boolean;
}

/**
 * Apply ThreadRing membership boost to search results
 * Boosts results from domains that are part of the user's rings
 */
export function boostByRingMembership(
  results: ExtSearchResultItem[],
  ringMembers: RingMember[]
): ExtSearchResultItem[] {
  // Create a map of ring member domains for fast lookup
  const memberDomains = new Map<string, RingMember>();

  for (const member of ringMembers) {
    const normalizedDomain = member.domain
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/^https?:\/\//, '');
    memberDomains.set(normalizedDomain, member);
  }

  // Apply boost to matching results
  return results.map(result => {
    const normalizedUrl = normalizeUrl(result.url);
    const member = memberDomains.get(normalizedUrl.domain);

    if (member) {
      // Calculate boost based on trust score and verification
      let boostMultiplier = 1.25; // Base 25% boost for ring members

      if (member.isVerified) {
        boostMultiplier += 0.1; // Extra 10% for verified members
      }

      if (member.trustScore) {
        // Add up to 15% based on trust score (0-1)
        boostMultiplier += member.trustScore * 0.15;
      }

      const currentScore = result.score ?? 0.5;
      const boostedScore = Math.min(currentScore * boostMultiplier, 1.0); // Cap at 1.0

      return {
        ...result,
        score: boostedScore,
        // Add visual indicator that this is from a ring member
        engineMetadata: {
          ...result.engineMetadata,
          isRingMember: true,
          ringMemberVerified: member.isVerified,
        }
      };
    }

    return result;
  });
}

/**
 * Apply community signals boost
 * Boosts results based on community engagement metrics
 */
export function boostByCommunitySignals(
  results: ExtSearchResultItem[],
  communityData?: {
    popularDomains?: Array<{ domain: string; score: number }>;
    recentlyShared?: Array<{ url: string; shares: number }>;
    userBookmarks?: string[];
  }
): ExtSearchResultItem[] {
  if (!communityData) return results;

  // Create lookup maps
  const popularDomainsMap = new Map<string, number>();
  const recentSharesMap = new Map<string, number>();
  const bookmarksSet = new Set<string>();

  if (communityData.popularDomains) {
    for (const item of communityData.popularDomains) {
      const normalized = item.domain.toLowerCase().replace(/^www\./, '');
      popularDomainsMap.set(normalized, item.score);
    }
  }

  if (communityData.recentlyShared) {
    for (const item of communityData.recentlyShared) {
      const normalized = normalizeUrl(item.url).normalized;
      recentSharesMap.set(normalized, item.shares);
    }
  }

  if (communityData.userBookmarks) {
    for (const bookmark of communityData.userBookmarks) {
      const normalized = normalizeUrl(bookmark).normalized;
      bookmarksSet.add(normalized);
    }
  }

  // Apply boosts
  return results.map(result => {
    const normalizedUrl = normalizeUrl(result.url);
    let boostMultiplier = 1.0;

    // Check if domain is popular in community
    const domainScore = popularDomainsMap.get(normalizedUrl.domain);
    if (domainScore) {
      boostMultiplier += domainScore * 0.1; // Up to 10% boost
    }

    // Check if URL was recently shared
    const shareCount = recentSharesMap.get(normalizedUrl.normalized);
    if (shareCount) {
      // Logarithmic boost based on share count
      boostMultiplier += Math.log10(shareCount + 1) * 0.05;
    }

    // Check if user has bookmarked this
    if (bookmarksSet.has(normalizedUrl.normalized)) {
      boostMultiplier += 0.2; // 20% boost for bookmarked items
    }

    if (boostMultiplier > 1.0) {
      const currentScore = result.score ?? 0.5;
      const boostedScore = Math.min(currentScore * boostMultiplier, 1.0);

      return {
        ...result,
        score: boostedScore,
        engineMetadata: {
          ...result.engineMetadata,
          communityBoost: boostMultiplier - 1.0,
        }
      };
    }

    return result;
  });
}

/**
 * Apply recency boost for newer content
 */
export function boostByRecency(
  results: ExtSearchResultItem[],
  options?: {
    decayRate?: number; // How quickly the boost decays (default: 0.1)
    maxBoost?: number;  // Maximum boost for very recent content (default: 0.2)
  }
): ExtSearchResultItem[] {
  const decayRate = options?.decayRate ?? 0.1;
  const maxBoost = options?.maxBoost ?? 0.2;
  const now = Date.now();

  return results.map(result => {
    if (!result.publishedDate) return result;

    try {
      const publishedTime = new Date(result.publishedDate).getTime();
      const ageInDays = (now - publishedTime) / (1000 * 60 * 60 * 24);

      // Only boost content from the last 30 days
      if (ageInDays <= 30 && ageInDays >= 0) {
        // Exponential decay: newer content gets higher boost
        const recencyBoost = maxBoost * Math.exp(-decayRate * ageInDays);
        const currentScore = result.score ?? 0.5;
        const boostedScore = Math.min(currentScore + recencyBoost, 1.0);

        return {
          ...result,
          score: boostedScore,
          engineMetadata: {
            ...result.engineMetadata,
            recencyBoost,
            ageInDays: Math.floor(ageInDays),
          }
        };
      }
    } catch (error) {
      // Invalid date, skip boost
    }

    return result;
  });
}

/**
 * Composite boost function that applies all boosts
 */
export function applyAllBoosts(
  results: ExtSearchResultItem[],
  boostConfig?: {
    ringMembers?: RingMember[];
    communityData?: {
      popularDomains?: Array<{ domain: string; score: number }>;
      recentlyShared?: Array<{ url: string; shares: number }>;
      userBookmarks?: string[];
    };
    enableRecencyBoost?: boolean;
  }
): ExtSearchResultItem[] {
  let boostedResults = results;

  // Apply ring membership boost
  if (boostConfig?.ringMembers && boostConfig.ringMembers.length > 0) {
    boostedResults = boostByRingMembership(boostedResults, boostConfig.ringMembers);
  }

  // Apply community signals boost
  if (boostConfig?.communityData) {
    boostedResults = boostByCommunitySignals(boostedResults, boostConfig.communityData);
  }

  // Apply recency boost
  if (boostConfig?.enableRecencyBoost) {
    boostedResults = boostByRecency(boostedResults);
  }

  // Re-sort after all boosts
  boostedResults.sort((a, b) => (b.score ?? 0.5) - (a.score ?? 0.5));

  return boostedResults;
}