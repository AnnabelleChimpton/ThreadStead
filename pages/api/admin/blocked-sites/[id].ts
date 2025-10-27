import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require admin authentication
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));
