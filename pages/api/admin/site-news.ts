import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/server';
import { db } from '../../../lib/config/database/connection';
import { z } from 'zod';

const createNewsSchema = z.object({
  title: z.string().min(1).max(255),
  summary: z.string().min(1).max(500),
  content: z.string().optional(),
  url: z.string().optional(),
  type: z.enum(['announcement', 'feature', 'maintenance', 'community']),
  priority: z.enum(['high', 'medium', 'low']),
  isPublished: z.boolean().default(true),
  publishedAt: z.string().optional()
});

const updateNewsSchema = createNewsSchema.partial();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    if (req.method === 'GET') {
      // Get all site news with pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const [news, totalCount] = await Promise.all([
        db.siteNews.findMany({
          orderBy: [
            { priority: 'desc' },
            { publishedAt: 'desc' }
          ],
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

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Site news API error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}