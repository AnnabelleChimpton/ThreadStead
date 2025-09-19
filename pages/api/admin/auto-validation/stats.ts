/**
 * Auto-validation statistics API for admin dashboard
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

    // Get pending crawler submissions
    const pendingSites = await db.indexedSite.findMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false,
        autoValidated: { not: true }
      },
      select: {
        seedingScore: true
      }
    });

    // Categorize by score
    const pending = {
      total: pendingSites.length,
      highScore: pendingSites.filter(s => (s.seedingScore || 0) >= 75).length,
      mediumScore: pendingSites.filter(s => {
        const score = s.seedingScore || 0;
        return score >= 30 && score < 75;
      }).length,
      lowScore: pendingSites.filter(s => (s.seedingScore || 0) < 30).length
    };

    // Get processed sites (approved and rejected)
    const [approvedSites, rejectedSites] = await Promise.all([
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: true,
          communityValidated: true
        }
      }),
      // Rejected sites are deleted, so we can't count them directly
      // This would need to be tracked in a separate audit log
      Promise.resolve(0) // Placeholder
    ]);

    const processed = {
      approved: approvedSites,
      rejected: rejectedSites,
      total: approvedSites + rejectedSites
    };

    // Get recent activity (sites auto-validated in different time periods)
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [recent24h, recent7d, recent30d] = await Promise.all([
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: true,
          autoValidatedAt: { gte: last24h }
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: true,
          autoValidatedAt: { gte: last7d }
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: true,
          autoValidatedAt: { gte: last30d }
        }
      })
    ]);

    const recent = {
      last24h: recent24h,
      last7d: recent7d,
      last30d: recent30d
    };

    return res.json({
      success: true,
      stats: {
        pending,
        processed,
        recent
      }
    });

  } catch (error) {
    console.error('Auto-validation stats error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}