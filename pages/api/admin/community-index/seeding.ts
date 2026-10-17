/**
 * Admin API for community index seeding controls
 */

import { apiHandler } from '@/lib/api/handler';
import { CommunityIndexSeeder } from '@/lib/community-index';

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Seeding API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
