import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

/**
 * API endpoint for managing blocked sites
 *
 * GET  /api/admin/blocked-sites - List all blocked sites (with optional category filter)
 * POST /api/admin/blocked-sites - Add a new blocked site
 */

interface BlockedSiteResponse {
  id: string;
  domain: string;
  category: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GetBlockedSitesResponse {
  sites: BlockedSiteResponse[];
  total: number;
  categories: { category: string; count: number }[];
}

interface CreateBlockedSiteRequest {
  domain: string;
  category: string;
  reason?: string;
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<GetBlockedSitesResponse | { error: string }>
) {
  try {
    const { category } = req.query;

    // Build where clause
    const where = category && typeof category === 'string'
      ? { category }
      : {};

    // Get blocked sites
    const sites = await db.blockedSite.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { domain: 'asc' }
      ]
    });

    // Get category counts
    const categoryGroups = await db.blockedSite.groupBy({
      by: ['category'],
      _count: { category: true }
    });

    const categories = categoryGroups.map(group => ({
      category: group.category,
      count: group._count.category
    }));

    // Format response
    const formattedSites: BlockedSiteResponse[] = sites.map(site => ({
      id: site.id,
      domain: site.domain,
      category: site.category,
      reason: site.reason,
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString()
    }));

    res.status(200).json({
      sites: formattedSites,
      total: formattedSites.length,
      categories
    });
  } catch (error) {
    console.error('Error fetching blocked sites:', error);
    res.status(500).json({ error: 'Failed to fetch blocked sites' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<BlockedSiteResponse | { error: string }>
) {
  try {
    const { domain, category, reason }: CreateBlockedSiteRequest = req.body;

    // Validate input
    if (!domain || !category) {
      return res.status(400).json({ error: 'Domain and category are required' });
    }

    // Normalize domain (lowercase, remove www.)
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    // Check if already exists
    const existing = await db.blockedSite.findUnique({
      where: { domain: normalizedDomain }
    });

    if (existing) {
      return res.status(409).json({ error: 'Domain already blocked' });
    }

    // Create blocked site
    const blockedSite = await db.blockedSite.create({
      data: {
        domain: normalizedDomain,
        category,
        reason: reason || null
      }
    });

    res.status(201).json({
      id: blockedSite.id,
      domain: blockedSite.domain,
      category: blockedSite.category,
      reason: blockedSite.reason,
      createdAt: blockedSite.createdAt.toISOString(),
      updatedAt: blockedSite.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating blocked site:', error);
    res.status(500).json({ error: 'Failed to create blocked site' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require admin authentication
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
