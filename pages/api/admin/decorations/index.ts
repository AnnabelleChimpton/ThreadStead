import { db } from "@/lib/config/database/connection";
import { ZodError } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { createDecorationSchema, windowProblem } from "@/lib/domain/decorations/admin-requests";
import { parsePagePagination } from "@/lib/server/http/pagination";

export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user }) => {
    try {
      if (req.method === 'GET') {
        // List all decorations with pagination
        const { page, limit } = parsePagePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
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
          description,
          releaseType = 'DEFAULT',
          releaseStartAt,
          releaseEndAt,
          maxClaims,
          gridWidth: width,
          gridHeight: height
        } = createDecorationSchema.parse(req.body);
        // A cleared size box sends null: 1×1, as when left out
        const gridWidth = width ?? 1;
        const gridHeight = height ?? 1;

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

        // A limited-time release from the start needs its window; the form
        // has none, so it's set afterwards with Release
        if (releaseType === 'LIMITED_TIME') {
          const problem = windowProblem(releaseStartAt ? new Date(releaseStartAt) : null, releaseEndAt ? new Date(releaseEndAt) : null);
          if (problem) return res.status(400).json({ error: `${problem} Make the item first, then set its window with Release.` });
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
    } catch (error) {
      // A body that doesn't fit is apiHandler's to answer (a 400 that says what to fix)
      if (error instanceof ZodError) throw error;
      console.error('Admin decorations API error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);