import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));
    const search = String(req.query.search || "").trim();
    const sort = String(req.query.sort || "trending"); // trending, newest, members, posts, alphabetical

    const viewer = await getSessionUser(req);

    // Base where clause - only show public and unlisted ThreadRings for non-members
    let whereClause: any = {
      visibility: {
        in: ["public", "unlisted"]
      }
    };

    // Add search filter if provided
    if (search) {
      whereClause = {
        ...whereClause,
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            description: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            slug: {
              contains: search,
              mode: "insensitive"
            }
          }
        ]
      };
    }

    // Determine sort order
    let orderBy: any;
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "members":
        orderBy = { memberCount: "desc" };
        break;
      case "posts":
        orderBy = { postCount: "desc" };
        break;
      case "alphabetical":
        orderBy = { name: "asc" };
        break;
      case "trending":
      default:
        // Trending calculation: Recent activity (posts + members) weighted by recency
        // For now, we'll use a combination of member count and post count
        // In a future enhancement, we could add a calculated trending score
        orderBy = [
          { postCount: "desc" },
          { memberCount: "desc" },
          { createdAt: "desc" }
        ];
        break;
    }

    const threadRings = await db.threadRing.findMany({
      where: whereClause,
      include: {
        curator: {
          select: {
            id: true,
            handles: {
              select: {
                handle: true,
                host: true,
              },
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        // Include viewer's membership status if logged in
        ...(viewer ? {
          members: {
            where: {
              userId: viewer.id
            },
            select: {
              id: true,
              role: true,
              joinedAt: true
            }
          }
        } : {})
      },
      orderBy,
      take: limit,
      skip: offset
    });

    // Transform the data for the response
    const transformedRings = threadRings.map(ring => {
      const curatorHandle = ring.curator.handles.find(h => h.host === "local")?.handle || 
                           ring.curator.handles[0]?.handle || 
                           "unknown";
      
      return {
        id: ring.id,
        name: ring.name,
        slug: ring.slug,
        description: ring.description,
        visibility: ring.visibility,
        joinType: ring.joinType,
        memberCount: ring.memberCount,
        postCount: ring.postCount,
        createdAt: ring.createdAt,
        curator: {
          handle: curatorHandle,
          displayName: ring.curator.profile?.displayName,
          avatarUrl: ring.curator.profile?.avatarUrl
        },
        // Include viewer's membership info if available
        ...(viewer && "members" in ring ? {
          viewerMembership: ring.members.length > 0 ? {
            role: ring.members[0].role,
            joinedAt: ring.members[0].joinedAt
          } : null
        } : {})
      };
    });

    return res.json({ 
      threadRings: transformedRings,
      hasMore: threadRings.length === limit,
      total: search ? undefined : await db.threadRing.count({
        where: {
          visibility: {
            in: ["public", "unlisted"]
          }
        }
      })
    });

  } catch (error) {
    console.error("Error fetching ThreadRings:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}