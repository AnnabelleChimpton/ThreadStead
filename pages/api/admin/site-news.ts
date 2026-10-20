import { db } from '../../../lib/config/database/connection';
import { z } from 'zod';
import { apiHandler } from '@/lib/api/handler';
import { parsePagePagination } from '@/lib/server/http/pagination';
import { SITE_NEWS_ORDER, createNewsSchema, newsValidationMessage } from '@/lib/domain/site-news';

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'admin', rateLimit: 'admin' },
  async (req, res, { user }) => {
    try {
      if (req.method === 'GET') {
        // Get all site news with pagination
        const { page, limit, skip: offset } = parsePagePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

        const [news, totalCount] = await Promise.all([
          db.siteNews.findMany({
            orderBy: SITE_NEWS_ORDER,
            skip: offset,
            take: limit,
            include: {
              author: {
                select: {
                  id: true,
                  primaryHandle: true,
                  profile: {
                    select: {
                      displayName: true
                    }
                  }
                }
              }
            }
          }),
          db.siteNews.count()
        ]);

        return res.status(200).json({
          news: news.map(item => ({
            ...item,
            authorName: item.author.profile?.displayName || item.author.primaryHandle?.split('@')[0] || 'Admin'
          })),
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        });
      }

      if (req.method === 'POST') {
        // Create new news item
        const validatedData = createNewsSchema.parse(req.body);

        const publishedAt = validatedData.publishedAt
          ? new Date(validatedData.publishedAt)
          : new Date();

        const newsItem = await db.siteNews.create({
          data: {
            title: validatedData.title,
            summary: validatedData.summary,
            content: validatedData.content,
            url: validatedData.url,
            type: validatedData.type,
            priority: validatedData.priority,
            isPublished: validatedData.isPublished,
            publishedAt,
            createdBy: user.id
          },
          include: {
            author: {
              select: {
                id: true,
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

        return res.status(201).json({
          ...newsItem,
          authorName: newsItem.author.profile?.displayName || newsItem.author.primaryHandle?.split('@')[0] || 'Admin'
        });
      }

    } catch (error) {
      console.error('Site news API error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: newsValidationMessage(error),
          details: error.issues
        });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
