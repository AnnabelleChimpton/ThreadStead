import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const page = parseInt(String(req.query.page || "1"));
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 100);
    const offset = (page - 1) * limit;
    
    const visibility = String(req.query.visibility || "all");
    const search = String(req.query.search || "").trim();
    const author = String(req.query.author || "").trim();

    // Build where clause
    const whereClause: any = {};
    
    // Filter by visibility
    if (visibility !== "all") {
      whereClause.visibility = visibility;
    }

    // Search in title and body
    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          bodyText: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    // Filter by author
    if (author) {
      whereClause.author = {
        OR: [
          {
            primaryHandle: {
              contains: author,
              mode: "insensitive"
            }
          },
          {
            profile: {
              displayName: {
                contains: author,
                mode: "insensitive"
              }
            }
          }
        ]
      };
    }

    // Get total count for pagination
    const totalCount = await db.post.count({ where: whereClause });

    // Get posts with full details
    const posts = await db.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            primaryHandle: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        },
        threadRings: {
          include: {
            threadRing: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      posts,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error("Error fetching admin posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}