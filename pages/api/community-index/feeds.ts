/**
 * API endpoint for discovery feeds
 * Provides various curated feeds of community-discovered sites
 */

import { apiHandler } from '@/lib/api/handler';
import { sendUnauthenticated } from '@/lib/api/errors';
import { DiscoveryFeedsManager } from '@/lib/community-index/feeds/discovery-feeds';

export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user }) => {
    try {
      // Check authentication (optional)
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
            return sendUnauthenticated(res);
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
);