import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../../lib/auth/server';
import { db } from '../../../../lib/config/database/connection';
import { z } from 'zod';

const updateNewsSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  summary: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  url: z.string().optional(),
  type: z.enum(['announcement', 'feature', 'maintenance', 'community']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const user = await getSessionUser(req);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

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
      const validatedData = updateNewsSchema.parse(req.body);

      const updateData: any = { ...validatedData };
      if (validatedData.publishedAt) {
        updateData.publishedAt = new Date(validatedData.publishedAt);
      }

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

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Site news API error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
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