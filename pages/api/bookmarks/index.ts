import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

export default apiHandler(
  { methods: ['GET'], auth: 'user' },
  async (req, res, { user }) => {
    try {
      const { collectionId, page = '1', limit = '20', search } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = { userId: user.id };

      if (collectionId && collectionId !== 'all') {
        where.collectionId = collectionId as string;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { url: { contains: search as string, mode: 'insensitive' } },
          { tags: { hasSome: [(search as string).toLowerCase()] } }
        ];
      }

      // Get bookmarks with pagination
      const [bookmarks, total] = await Promise.all([
        db.userBookmark.findMany({
          where,
          include: {
            collection: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum
        }),
        db.userBookmark.count({ where })
      ]);

      return res.json({
        success: true,
        bookmarks: bookmarks.map(bookmark => ({
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          faviconUrl: bookmark.faviconUrl,
          sourceType: bookmark.sourceType,
          sourceMetadata: bookmark.sourceMetadata,
          tags: bookmark.tags,
          notes: bookmark.notes,
          visitsCount: bookmark.visitsCount,
          lastVisitedAt: bookmark.lastVisitedAt,
          createdAt: bookmark.createdAt,
          collection: bookmark.collection ? {
            id: bookmark.collection.id,
            name: bookmark.collection.name
          } : null
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: offset + limitNum < total
        }
      });

    } catch (error) {
      console.error('Bookmarks API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
