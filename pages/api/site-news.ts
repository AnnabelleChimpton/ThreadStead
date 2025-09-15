import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

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
      orderBy: [
        { priority: 'desc' },
        { publishedAt: 'desc' }
      ],
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
      url: item.url || `/news/${item.id}`,
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