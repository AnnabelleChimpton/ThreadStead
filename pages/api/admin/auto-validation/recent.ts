/**
 * Recent auto-validations API for admin dashboard
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin authentication
    const user = await getSessionUser(req as any);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Admin access required' });
    }

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