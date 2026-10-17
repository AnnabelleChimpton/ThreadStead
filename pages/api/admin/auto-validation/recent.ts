/**
 * Recent auto-validations API for admin dashboard
 */

import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

export default apiHandler(
  { methods: ['GET'], auth: 'admin' },
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      // Get recent auto-validations
      const recentValidations = await db.indexedSite.findMany({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: { not: null },
          autoValidatedAt: { not: null }
        },
        select: {
          id: true,
          url: true,
          title: true,
          autoValidated: true,
          autoValidatedAt: true,
          autoValidationScore: true,
          seedingScore: true
        },
        orderBy: {
          autoValidatedAt: 'desc'
        },
        take: limit
      });

      return res.json({
        success: true,
        validations: recentValidations
      });

    } catch (error) {
      console.error('Recent auto-validations error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
