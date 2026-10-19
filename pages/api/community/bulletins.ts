import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { activeUserWhere } from '@/lib/domain/users/moderation';
import { parseLimit } from '@/lib/server/http/pagination';

/**
 * GET /api/community/bulletins
 * Returns recent active bulletins for Community Center widget
 * Query params:
 *   - limit: number of bulletins to return (default: 5)
 */
export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
    try {
      const limit = parseLimit(req.query.limit, { fallback: 5, max: 50 });
      const now = new Date();

      const bulletins = await db.bulletin.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gt: now,
          },
          // Notes from suspended or banned accounts come off the board
          user: activeUserWhere(now),
        },
        include: {
          user: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return res.status(200).json({ bulletins });
    } catch (error) {
      console.error('Error fetching bulletins:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
