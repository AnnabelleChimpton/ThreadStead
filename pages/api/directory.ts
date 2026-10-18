import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";

import { SITE_NAME } from "@/lib/config/site/constants";
import { escapeLike, parseIntParam } from "@/lib/search/query";

const SORTS = ["recent", "alphabetical", "posts", "random"];

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (req, res) => {
    // Bad numbers are a 400 (thrown ApiError), not NaN → 500 or a negative skip.
    const limit = parseIntParam(req.query.limit, "limit", { fallback: 20, min: 1, max: 50 });
    const offset = parseIntParam(req.query.offset, "offset", { fallback: 0, min: 0 });
    const sortBy = String(req.query.sortBy || "recent");
    if (!SORTS.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy "${sortBy}" — expected one of: ${SORTS.join(", ")}` });
    }

    try {
      // Prisma sends `contains` as ILIKE without escaping: `%` listed everyone.
      const search = escapeLike(String(req.query.search || "").trim());

      // Profiles that aren't public 403 on view, so they don't belong in a
      // public directory (with their bio). No profile row means public.
      const whereClause: any = {
        handles: {
          some: {
            host: SITE_NAME
          }
        },
        AND: [
          {
            OR: [
              { profile: { is: null } },
              { profile: { is: { visibility: "public" } } },
            ],
          },
        ],
      };

      if (search) {
        whereClause.OR = [
          {
            handles: {
              some: {
                handle: {
                  contains: search,
                  mode: "insensitive"
                },
                host: SITE_NAME
              }
            }
          },
          {
            profile: {
              displayName: {
                contains: search,
                mode: "insensitive"
              }
            }
          },
          {
            profile: {
              bio: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        ];
      }

      // Build order clause
      let orderBy: any = { createdAt: "desc" }; // default: recent

      if (sortBy === "alphabetical") {
        orderBy = {
          handles: {
            _count: "desc" // This is a workaround - we'll sort by handle in JS
          }
        };
      } else if (sortBy === "posts") {
        orderBy = {
          posts: {
            _count: "desc"
          }
        };
      }

      // sortBy=random used to fall through to "recent". Pick `limit` random
      // ids from the matching set (a few hundred rows of ids — cheap).
      let randomIds: string[] | null = null;
      if (sortBy === "random") {
        const ids = await db.user.findMany({ where: whereClause, select: { id: true } });
        randomIds = shuffle(ids.map((u) => u.id)).slice(0, limit);
      }

      const users = await db.user.findMany({
        where: randomIds ? { id: { in: randomIds } } : whereClause,
        include: {
          handles: {
            where: { host: SITE_NAME },
            take: 1,
            orderBy: { handle: "asc" }
          },
          profile: {
            select: {
              displayName: true,
              bio: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              posts: {
                where: {
                  visibility: "public"
                }
              },
              followers: true,
              following: true
            }
          }
        },
        ...(randomIds ? {} : { orderBy, take: limit, skip: offset })
      });

      // Transform and filter users who have local handles
      const transformedUsers = users
        .filter(user => user.handles.length > 0)
        .map(user => ({
          id: user.id,
          username: user.handles[0]?.handle || null,
          displayName: user.profile?.displayName || null,
          bio: user.profile?.bio || null,
          avatarUrl: user.profile?.avatarUrl || null,
          createdAt: user.createdAt,
          postCount: user._count.posts,
          followerCount: user._count.followers,
          followingCount: user._count.following
        }));

      // Sort alphabetically if requested (since Prisma doesn't handle this well with relations)
      if (sortBy === "alphabetical") {
        transformedUsers.sort((a, b) => {
          const nameA = (a.displayName || a.username || "").toLowerCase();
          const nameB = (b.displayName || b.username || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      }

      if (randomIds) {
        const order = new Map(randomIds.map((id, i) => [id, i]));
        transformedUsers.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      }

      // Get total count for pagination
      const totalUsers = await db.user.count({
        where: whereClause
      });

      return res.json({
        users: transformedUsers,
        hasMore: randomIds ? false : offset + transformedUsers.length < totalUsers,
        total: totalUsers
      });

    } catch (error) {
      console.error("Error fetching directory:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);