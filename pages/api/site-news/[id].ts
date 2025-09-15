import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'News ID is required' });
  }

  try {
    const news = await db.siteNews.findFirst({
      where: {
        id: id,
        isPublished: true,
        publishedAt: {
          lte: new Date() // Only show news that's already published
        }
      },
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        url: true,
        publishedAt: true,
        type: true,
        priority: true,
        isPublished: true,
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

    if (!news) {
      return res.status(404).json({ success: false, error: 'News article not found' });
    }

    const formattedNews = {
      id: news.id,
      title: news.title,
      summary: news.summary,
      content: news.content,
      url: news.url || `/news/${news.id}`,
      publishedAt: news.publishedAt.toISOString(),
      type: news.type,
      priority: news.priority,
      isPublished: news.isPublished,
      author: news.author.profile?.displayName || news.author.primaryHandle?.split('@')[0] || 'Admin'
    };

    return res.status(200).json({
      success: true,
      news: formattedNews
    });

  } catch (error) {
    console.error('Site news article API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}