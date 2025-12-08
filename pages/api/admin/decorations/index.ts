import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

interface CreateDecorationRequest {
  itemId: string;
  name: string;
  type: string;
  category: string;
  zone: string;
  section?: string;
  iconSvg?: string;
  renderSvg?: string;
  imagePath?: string;
  gridWidth?: number;
  gridHeight?: number;
  description?: string;
  releaseType?: 'DEFAULT' | 'PUBLIC' | 'LIMITED_TIME' | 'CLAIM_CODE' | 'ADMIN_ONLY' | 'BETA_USERS';
  releaseStartAt?: string;
  releaseEndAt?: string;
  maxClaims?: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method === 'GET') {
      // List all decorations with pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const releaseType = req.query.releaseType as string;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { itemId: { contains: search, mode: 'insensitive' as const } },
            { type: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } }
          ]
        }),
        ...(releaseType && { releaseType: releaseType as any })
      };

      const [decorations, total] = await Promise.all([
        db.decorationItem.findMany({
          where,
          include: {
            creator: {
              select: { id: true, primaryHandle: true }
            },
            _count: {
              select: { userClaims: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        db.decorationItem.count({ where })
      ]);

      return res.status(200).json({
        decorations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (req.method === 'POST') {
      // Create new decoration
      const {
        itemId,
        name,
        type,
        category,
        zone,
        section,
        iconSvg,
        renderSvg,
        imagePath,
        gridWidth = 1,
        gridHeight = 1,
        description,
        releaseType = 'DEFAULT',
        releaseStartAt,
        releaseEndAt,
        maxClaims
      }: CreateDecorationRequest = req.body;

      // Validate required fields
      if (!itemId || !name || !type || !category || !zone) {
        return res.status(400).json({
          error: "Missing required fields: itemId, name, type, category, zone"
        });
      }

      // Check if itemId already exists
      const existingItem = await db.decorationItem.findUnique({
        where: { itemId }
      });

      if (existingItem) {
        return res.status(400).json({
          error: `Decoration with itemId '${itemId}' already exists`
        });
      }

      // Validate SVG or image is provided
      if (!iconSvg && !imagePath) {
        return res.status(400).json({
          error: "Either iconSvg or imagePath must be provided"
        });
      }

      // Validate time-based releases
      if (releaseType === 'LIMITED_TIME') {
        if (!releaseStartAt || !releaseEndAt) {
          return res.status(400).json({
            error: "releaseStartAt and releaseEndAt required for LIMITED_TIME releases"
          });
        }

        const startDate = new Date(releaseStartAt);
        const endDate = new Date(releaseEndAt);

        if (startDate >= endDate) {
          return res.status(400).json({
            error: "releaseStartAt must be before releaseEndAt"
          });
        }
      }

      // Create decoration
      const decoration = await db.decorationItem.create({
        data: {
          itemId,
          name,
          type,
          category,
          zone,
          section: section || null,
          iconSvg,
          renderSvg,
          imagePath,
          gridWidth,
          gridHeight,
          description,
          releaseType,
          releaseStartAt: releaseStartAt ? new Date(releaseStartAt) : null,
          releaseEndAt: releaseEndAt ? new Date(releaseEndAt) : null,
          maxClaims,
          createdBy: user.id
        },
        include: {
          creator: {
            select: { id: true, primaryHandle: true }
          }
        }
      });

      return res.status(201).json({ decoration });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error('Admin decorations API error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));