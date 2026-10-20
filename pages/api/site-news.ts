import { db } from '../../lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { parseOffsetPagination } from '@/lib/server/http/pagination';
import { SITE_NEWS_ORDER } from '@/lib/domain/site-news';

export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
    try {
      const { limit, offset } = parseOffsetPagination(req.query, { defaultLimit: 10, maxLimit: 20 });

      // Get total count for hasMore calculation
      const total = await db.siteNews.count({
        where: {
          isPublished: true,
          publishedAt: {
            lte: new Date()
          }
        }
      });

      const news = await db.siteNews.findMany({
        where: {
          isPublished: true,
          publishedAt: {
            lte: new Date() // Only show news that's already published
          }
        },
        orderBy: SITE_NEWS_ORDER,
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          summary: true,
          url: true,
          publishedAt: true,
          type: true,
          priority: true,
          author: {
            select: {
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true
                }
              }
            }
          }
        }
      });

      const formattedNews = news.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url || `/community/news/${item.id}`,
        publishedAt: item.publishedAt.toISOString(),
        type: item.type,
        priority: item.priority,
        author: item.author.profile?.displayName || item.author.primaryHandle?.split('@')[0] || 'Admin'
      }));

      const hasMore = offset + news.length < total;

      return res.status(200).json({
        news: formattedNews,
        hasMore,
        total
      });

    } catch (error) {
      console.error('Public site news API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);