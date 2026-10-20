import { db } from '../../../../lib/config/database/connection';
import { z } from 'zod';
import { apiHandler } from '@/lib/api/handler';
import { updateNewsSchema, newsValidationMessage } from '@/lib/domain/site-news';

export default apiHandler(
  { methods: ['GET', 'PATCH', 'DELETE'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid news item ID' });
    }

    try {
      if (req.method === 'GET') {
        // Get single news item
        const newsItem = await db.siteNews.findUnique({
          where: { id },
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

        if (!newsItem) {
          return res.status(404).json({ error: 'News item not found' });
        }

        return res.status(200).json({
          ...newsItem,
          authorName: newsItem.author.profile?.displayName || newsItem.author.primaryHandle?.split('@')[0] || 'Admin'
        });
      }

      if (req.method === 'PATCH') {
        // Update news item
        const { publishedAt, ...fields } = updateNewsSchema.parse(req.body);

        const updateData = {
          ...fields,
          ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {})
        };

        const updatedNewsItem = await db.siteNews.update({
          where: { id },
          data: updateData,
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

        return res.status(200).json({
          ...updatedNewsItem,
          authorName: updatedNewsItem.author.profile?.displayName || updatedNewsItem.author.primaryHandle?.split('@')[0] || 'Admin'
        });
      }

      if (req.method === 'DELETE') {
        // Delete news item
        await db.siteNews.delete({
          where: { id }
        });

        return res.status(200).json({ success: true });
      }

    } catch (error) {
      console.error('Site news API error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: newsValidationMessage(error),
          details: error.issues
        });
      }

      // Handle Prisma not found error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        return res.status(404).json({ error: 'News item not found' });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
