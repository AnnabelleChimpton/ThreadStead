import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, sortBy, page = '1', limit = '15', validationStatus = 'validated' } = req.query;

    // For now, redirect to the existing feeds API with the recent feed
    // This provides a working fallback until a proper browse API is implemented
    const feedType = sortBy === 'recent' ? 'recent' : 'recent'; // Can be extended later

    const feedResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/community-index/feeds?type=${feedType}&limit=${limit}&category=${category}`
    );

    if (feedResponse.ok) {
      const feedData = await feedResponse.json();
      return res.json({
        success: true,
        sites: feedData.sites || [],
        total: feedData.totalCount || 0,
        page: parseInt(page as string),
        totalPages: Math.ceil((feedData.totalCount || 0) / parseInt(limit as string))
      });
    }

    // Fallback empty response
    return res.json({
      success: true,
      sites: [],
      total: 0,
      page: 1,
      totalPages: 0
    });

  } catch (error) {
    console.error('Browse API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
}