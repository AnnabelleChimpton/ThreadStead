/**
 * API endpoint for discovery feeds
 * Provides various curated feeds of community-discovered sites
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { DiscoveryFeedsManager } from '@/lib/community-index/feeds/discovery-feeds';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication (optional)
    const user = await getSessionUser(req as any);
    const userId = user?.id;

    const feedsManager = new DiscoveryFeedsManager();
    const {
      type = 'all',
      category = 'all',
      limit = '15'
    } = req.query;

    const limitNum = parseInt(limit as string) || 15;
    const categoryFilter = category === 'all' ? undefined : category as string;

    switch (type) {
      case 'recent':
        const recentFeed = await feedsManager.getRecentlyFoundFeed(limitNum, categoryFilter, userId);
        return res.json({ success: true, feed: recentFeed });

      case 'favorites':
        const favoritesFeed = await feedsManager.getFavoritesFeed(limitNum, categoryFilter, userId);
        return res.json({ success: true, feed: favoritesFeed });

      case 'hidden_gems':
        const hiddenGemsFeed = await feedsManager.getHiddenGemsFeed(limitNum, categoryFilter, userId);
        return res.json({ success: true, feed: hiddenGemsFeed });

      case 'trending':
        const trendingFeed = await feedsManager.getTrendingFeed(limitNum, categoryFilter, userId);
        return res.json({ success: true, feed: trendingFeed });

      case 'recommendations':
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required for recommendations' });
        }
        const recommendationsFeed = await feedsManager.getUserRecommendationsFeed(userId, limitNum, categoryFilter);
        return res.json({ success: true, feed: recommendationsFeed });

      case 'all':
      default:
        const allFeeds = await feedsManager.getAllFeeds(userId, categoryFilter, limitNum);
        return res.json({ success: true, feeds: allFeeds });
    }

  } catch (error) {
    console.error('Discovery feeds API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}