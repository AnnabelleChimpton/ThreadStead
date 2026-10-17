import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

/**
 * API endpoint for managing individual blocked sites
 *
 * DELETE /api/admin/blocked-sites/[id] - Remove a blocked site
 */

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean } | { error: string }>
) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    // Check if exists
    const blockedSite = await db.blockedSite.findUnique({
      where: { id }
    });

    if (!blockedSite) {
      return res.status(404).json({ error: 'Blocked site not found' });
    }

    // Delete the blocked site
    await db.blockedSite.delete({
      where: { id }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting blocked site:', error);
    res.status(500).json({ error: 'Failed to delete blocked site' });
  }
}

export default apiHandler(
  { methods: ['DELETE'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
    return handleDelete(req, res);
  }
);
