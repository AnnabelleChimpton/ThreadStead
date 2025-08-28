import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { getRingHubClient } from "@/lib/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

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
    const membership = String(req.query.membership || "").trim() === "true"; // Filter to only user's memberships

    const viewer = await getSessionUser(req);

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      console.log('🔐 ThreadRings API Auth Debug:', {
        hasViewer: !!viewer,
        viewerUserId: viewer?.id,
        membershipFilter: membership
      });
      
      // Use authenticated client if user is logged in for membership info
      let ringHubClient;
      if (viewer) {
        console.log('✅ Using authenticated RingHub client for user:', viewer.id);
        ringHubClient = createAuthenticatedRingHubClient(viewer.id);
      } else {
        console.log('🌐 Using unauthenticated RingHub client');
        ringHubClient = getRingHubClient();
        if (!ringHubClient) {
          return res.status(500).json({ error: "Ring Hub client not configured" });
        }
      }

      // Build Ring Hub parameters  
      const ringHubOptions: any = {};
      if (search?.trim()) ringHubOptions.search = search.trim();
      if (limit !== 20) ringHubOptions.limit = limit;
      if (offset > 0) ringHubOptions.offset = offset;
      
      // Map sort parameters to Ring Hub format
      if (sort) {
        switch (sort) {
          case 'newest':
            ringHubOptions.sort = 'created';
            ringHubOptions.order = 'desc';
            break;
          case 'members':
            ringHubOptions.sort = 'members';
            ringHubOptions.order = 'desc';
            break;
          case 'posts':  
            ringHubOptions.sort = 'posts';
            ringHubOptions.order = 'desc';
            break;
          case 'alphabetical':
            ringHubOptions.sort = 'name';
            ringHubOptions.order = 'asc';
            break;
          case 'trending':
          default:
            ringHubOptions.sort = 'updated';
            ringHubOptions.order = 'desc';
            break;
        }
      }

      const result = await ringHubClient.listRings(ringHubOptions);

      console.log('🔍 RingHub API Response Debug:', {
        authenticated: !!viewer,
        totalRings: result.rings?.length || 0,
        firstRingHasCurrentUserMembership: result.rings?.[0]?.currentUserMembership !== undefined,
        sampleRing: result.rings?.[0] ? {
          slug: result.rings[0].slug,
          name: result.rings[0].name,
          currentUserMembership: result.rings[0].currentUserMembership
        } : null
      });

      // Transform Ring Hub response to ThreadStead format
      let transformedRings = result.rings.map((descriptor: any) => {
        const transformed = {
          id: descriptor.id,
          name: descriptor.name,
          slug: descriptor.slug,
          description: descriptor.description,
          visibility: descriptor.visibility?.toLowerCase() || 'public', // PUBLIC -> public
          joinType: descriptor.joinPolicy === 'OPEN' ? 'open' : 'closed', // OPEN -> open
          memberCount: descriptor.memberCount || 0,
          postCount: descriptor.postCount || 0,
          createdAt: descriptor.createdAt,
          curator: null, // Ring Hub doesn't include curator in list responses
          // Map RingHub currentUserMembership to ThreadStead viewerMembership format
          viewerMembership: descriptor.currentUserMembership ? {
            role: descriptor.currentUserMembership.role.toLowerCase(),
            joinedAt: descriptor.currentUserMembership.joinedAt
          } : null
        };
        
        // Debug log first ring transformation
        if (descriptor === result.rings[0]) {
          console.log('🔄 First Ring Transformation:', {
            originalSlug: descriptor.slug,
            originalCurrentUserMembership: descriptor.currentUserMembership,
            transformedViewerMembership: transformed.viewerMembership
          });
        }
        
        return transformed;
      });

      // Filter to only user's memberships if requested
      if (membership && viewer) {
        transformedRings = transformedRings.filter(ring => ring.viewerMembership !== null);
      }

      // For "My ThreadRings" tab, we need to estimate total since we're filtering after fetch
      // This is a limitation we could improve with a dedicated RingHub endpoint
      const filteredTotal = membership && viewer 
        ? transformedRings.length // Best we can do without server-side filtering
        : result.total;
      
      const hasMore = !membership && (offset + limit) < result.total;
      
      console.log('📤 Final Response Debug:', {
        totalRings: transformedRings.length,
        ringsWithMembership: transformedRings.filter(r => r.viewerMembership !== null).length,
        membershipFilter: membership,
        filteredTotal,
        hasMore
      });
      
      return res.json({
        threadRings: transformedRings,
        hasMore,
        total: filteredTotal
      });
    }

    // Original local ThreadRing logic

    // Base where clause - only show public and unlisted ThreadRings for non-members
    let whereClause: any = {
      visibility: {
        in: ["public", "unlisted"]
      }
    };

    // If membership filter is requested and user is logged in, filter to only their memberships
    if (membership && viewer) {
      whereClause = {
        ...whereClause,
        members: {
          some: {
            userId: viewer.id
          }
        }
      };
    }

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