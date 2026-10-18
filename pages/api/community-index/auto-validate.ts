/**
 * Auto-validation API for crawler submissions
 * Automatically approves/rejects sites based on quality scores.
 *
 * It hard-deletes index rows, so: admins (the button on
 * /admin/auto-validation) or a cron holding CRAWLER_API_KEY. It used to be
 * auth:'none'. Server-side callers use runAutoValidation() directly.
 */

import { apiHandler } from '@/lib/api/handler';
import { getServerEnv } from '@/lib/config/env';
import { runAutoValidation } from '@/lib/community-index/validation/auto-validate';

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'admin',
    rateLimit: 'admin',
    apiKey: () => getServerEnv().CRAWLER_API_KEY,
  },
  async (req, res) => {
    try {
      const force = req.body?.force === true;
      const result = await runAutoValidation({ force });

      return res.json({ success: true, ...result });

    } catch (error) {
      console.error('Auto-validation error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
