import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { parsePagePagination } from "@/lib/server/http/pagination";

export default apiHandler(
  { methods: ["GET"], auth: "admin" },
  async (req, res) => {
    try {
      const { page, limit, skip: offset } = parsePagePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

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
);
