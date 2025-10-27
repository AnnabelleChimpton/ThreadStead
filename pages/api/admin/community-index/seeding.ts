import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

/**
 * Admin API for community index seeding controls
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { CommunityIndexSeeder } from '@/lib/community-index';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication and admin role
    const user = await getSessionUser(req as any);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const seeder = new CommunityIndexSeeder();

    if (req.method === 'GET') {
      // Get seeding statistics
      const stats = await seeder.getSeedingStats();
      const health = await seeder.validateSeedingHealth();

      return res.json({
        success: true,
        stats,
        health
      });
    }

    if (req.method === 'POST') {
      const action = req.query.action as string;

      switch (action) {
        case 'run-daily':
          // Run daily seeding process
          const options = {
            maxQueries: parseInt(req.body.maxQueries) || 5,
            maxSitesPerQuery: parseInt(req.body.maxSitesPerQuery) || 20,
            minScore: parseInt(req.body.minScore) || 40,
            dryRun: req.body.dryRun === true
          };

          const report = await seeder.runDailySeeding(options);

          return res.json({
            success: true,
            message: `Seeding completed: ${report.sitesAdded} sites added, ${report.sitesRejected} rejected`,
            report
          });

        case 'seed-category':
          // Seed specific category
          const category = req.body.category;
          const maxSites = parseInt(req.body.maxSites) || 20;

          if (!category) {
            return res.status(400).json({ error: 'Category is required' });
          }

          const categoryReport = await seeder.seedByCategory(category, maxSites);

          return res.json({
            success: true,
            message: `Category seeding completed: ${categoryReport.sitesAdded} sites added`,
            report: categoryReport
          });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Seeding API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
