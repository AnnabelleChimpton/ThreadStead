import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { getRingHubClient } from "@/lib/ringhub-client";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
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

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      const client = getRingHubClient();
      if (!client) {
        return res.status(500).json({ error: "Ring Hub client not configured" });
      }

      // Get viewer's memberships if logged in
      const viewerMemberships: Map<string, any> = new Map();
      if (viewer) {
        try {
          const membershipsResult = await client.getMyMemberships({
            status: 'ACTIVE',
            limit: 100 // Get all active memberships
          });
          
          // Create a map of slug -> membership for quick lookup
          membershipsResult.memberships.forEach(membership => {
            viewerMemberships.set(membership.ringSlug, {
              role: membership.role.toLowerCase(),
              joinedAt: membership.joinedAt
            });
          });
        } catch (error) {
          console.error('Failed to fetch viewer memberships:', error);
          // Continue without membership info if this fails
        }
      }

      // Map sort parameter to Ring Hub format
      let sortBy: 'trending' | 'newest' | 'members' | 'posts' | 'alphabetical' | undefined;
      switch (sort) {
        case "newest": sortBy = "newest"; break;
        case "members": sortBy = "members"; break;
        case "posts": sortBy = "posts"; break;
        case "alphabetical": sortBy = "alphabetical"; break;
        case "trending": sortBy = "trending"; break;
        default: sortBy = undefined; // Ring Hub uses default
      }

      // Build Ring Hub parameters with strict validation
      let ringHubOptions: { search?: string; limit?: number; offset?: number } | undefined;
      
      if (search?.trim() || limit !== 20 || offset > 0) {
        ringHubOptions = {};
        if (search?.trim()) ringHubOptions.search = search.trim();
        if (limit !== 20 && limit >= 1 && limit <= 100) ringHubOptions.limit = limit;
        if (offset >= 0) ringHubOptions.offset = offset;
      }

      const result = await client.listRings(ringHubOptions);

      // Transform Ring Hub response to ThreadStead format
      const transformedRings = result.rings.map((descriptor: any) => {
        const membership = viewerMemberships.get(descriptor.slug);
        return {
          id: descriptor.id,
          name: descriptor.name,
          slug: descriptor.slug,
          description: descriptor.description,
          visibility: descriptor.visibility.toLowerCase(), // PUBLIC -> public
          joinType: descriptor.joinPolicy === 'OPEN' ? 'open' : 'closed', // OPEN/APPLICATION/CLOSED -> open/closed
          memberCount: descriptor.memberCount,
          postCount: descriptor.postCount,
          createdAt: descriptor.createdAt,
          curator: null, // Ring Hub doesn't include curator in list
          viewerMembership: membership || null // Include membership if user is a member
        };
      });

      const hasMore = (offset + limit) < result.total;
      
      return res.json({
        threadRings: transformedRings,
        hasMore,
        total: result.total
      });
    }

    // Original local ThreadRing logic

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
});