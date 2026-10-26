import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { z } from 'zod';
import { blockedDomainOf } from '@/lib/indie-index/blocklist';

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

/** What Admin > Indie Index's block form sends */
const createBlockedSiteSchema = z.object({
  domain: z.string().trim().min(1).max(300),
  category: z.string().trim().min(1).max(50),
  reason: z.string().max(500).nullable().optional(),
});

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
  const { domain, category, reason } = createBlockedSiteSchema.parse(req.body ?? {});
  const normalizedDomain = blockedDomainOf(domain);
  if (!normalizedDomain) {
    return res.status(400).json({ error: "That doesn't look like a site's address." });
  }

  try {

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

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
    if (req.method === 'GET') {
      return handleGet(req, res);
    } else if (req.method === 'POST') {
      return handlePost(req, res);
    }
  }
);
