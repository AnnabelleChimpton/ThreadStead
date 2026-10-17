import { DiscoveryFeedsManager } from '@/lib/community-index/feeds/discovery-feeds';
import { apiHandler } from '@/lib/api/handler';

export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user }) => {
    try {
      const { category, sortBy, page = '1', limit = '15', validationStatus = 'validated' } = req.query;

      // Get user for personalized feeds
      const userId = user?.id;

      const feedsManager = new DiscoveryFeedsManager();
      const limitNum = parseInt(limit as string) || 15;
      const categoryFilter = category === 'all' ? undefined : category as string;
      const pageNum = parseInt(page as string) || 1;

      // Determine which feed to fetch based on sortBy
      let feedData;
      switch (sortBy) {
        case 'recent':
          feedData = await feedsManager.getRecentlyFoundFeed(limitNum, categoryFilter, userId);
          break;
        case 'score':
          // Try favorites feed first, fall back to recent if empty
          feedData = await feedsManager.getFavoritesFeed(limitNum, categoryFilter, userId);
          if (!feedData?.sites || feedData.sites.length === 0) {
            // Fall back to recent feed sorted by score
            feedData = await feedsManager.getRecentlyFoundFeed(limitNum, categoryFilter, userId);
            if (feedData?.sites) {
              feedData.sites.sort((a: any, b: any) => (b.communityScore || 0) - (a.communityScore || 0));
            }
          }
          break;
        case 'alphabetical':
          // For alphabetical, we'll use the recent feed and sort it
          feedData = await feedsManager.getRecentlyFoundFeed(100, categoryFilter, userId);
          if (feedData.sites) {
            feedData.sites.sort((a: any, b: any) =>
              (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase())
            );
            // Paginate the sorted results
            const startIdx = (pageNum - 1) * limitNum;
            feedData.sites = feedData.sites.slice(startIdx, startIdx + limitNum);
          }
          break;
        default:
          feedData = await feedsManager.getRecentlyFoundFeed(limitNum, categoryFilter, userId);
      }

      // Extract sites from feed data
      const sites = feedData?.sites || [];
      const totalCount = (feedData as any)?.totalCount || sites.length;

      return res.json({
        success: true,
        sites: sites,
        total: totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      });

    } catch (error) {
      console.error('Browse API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        success: false
      });
    }
  }
);