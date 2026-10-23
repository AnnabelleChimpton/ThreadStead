import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { withThreadRingSupport } from "@/lib/api/ringhub/ringhub-middleware";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { cached } from "@/lib/api/ringhub/ringhub-cache";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { parseOffsetPagination } from "@/lib/server/http/pagination";

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
    const { limit, offset } = parseOffsetPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const search = String(req.query.search || "").trim();
    const sort = String(req.query.sort || "newest"); // newest, members, alphabetical
    const membership = String(req.query.membership || "").trim() === "true"; // Filter to only user's memberships

    const viewer = await getSessionUser(req);

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      // Signed out, nobody's rings are "yours"
      if (membership && !viewer) {
        return res.json({ threadRings: [], hasMore: false, total: 0, nextOffset: 0 });
      }

      // Logged-in viewers get a user-signed client (for currentUserMembership).
      // Anonymous viewers get the UNSIGNED public client: signing as the instance
      // DID gains nothing here, and when the hub can't resolve that key it turns
      // every listing into an auth error (the 2026-10-17 directory outage).
      let ringHubClient;
      if (viewer) {
        ringHubClient = createAuthenticatedRingHubClient(viewer.id);
      } else {
        ringHubClient = getPublicRingHubClient();
        if (!ringHubClient) {
          return res.status(500).json({ error: "Ring Hub client not configured" });
        }
      }

      // Build Ring Hub parameters  
      const ringHubOptions: any = {};
      if (search) ringHubOptions.search = search;
      if (limit !== 20) ringHubOptions.limit = limit;
      if (offset > 0) ringHubOptions.offset = offset;

      // My rings: the hub filters to the viewer's memberships and counts them
      if (membership && viewer && ringHubClient && 'getUserDID' in ringHubClient) {
        // We must use the DID associated with the authenticated client, which may differ 
        // from the local DB DID (e.g. did:web vs did:key)
        ringHubOptions.memberDid = await ringHubClient.getUserDID();
      }

      // With search words, no sort: the hub puts the best matches first.
      // The hub sorts by created/updated/name/members only (no post count).
      if (!search) {
        if (sort === 'members') {
          ringHubOptions.sort = 'members';
          ringHubOptions.order = 'desc';
        } else if (sort === 'alphabetical') {
          ringHubOptions.sort = 'name';
          ringHubOptions.order = 'asc';
        } else {
          ringHubOptions.sort = 'created';
          ringHubOptions.order = 'desc';
        }
      }

      let result;
      try {
        // Signed responses carry the signer's currentUserMembership, so they must
        // never be shared across viewers.
        result = await cached(
          `list-rings:${viewer ? `viewer:${viewer.id}` : 'anon'}:${JSON.stringify(ringHubOptions)}`,
          30_000,
          5 * 60_000,
          () => ringHubClient.listRings(ringHubOptions)
        );
      } catch (error) {
        if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
          console.error('Ring Hub unavailable for directory listing:', error.name, error.message);
          return res.status(503).json({ error: 'hub_unavailable', degraded: true });
        }
        throw error;
      }

      // Rings this viewer blocked. UserBlock points at the local ThreadRing
      // row; hub descriptors carry the hub's id, so match by slug.
      const blockedSlugs = new Set(
        viewer
          ? (
              await db.userBlock.findMany({
                where: { blockerId: viewer.id, blockedThreadRingId: { not: null } },
                select: { blockedThreadRing: { select: { slug: true } } },
              })
            ).map((block) => block.blockedThreadRing?.slug)
          : []
      );

      // Transform Ring Hub response to ThreadStead format. A signed listing
      // carries currentUserMembership on every ring the viewer has a row in.
      const transformedRings = result.rings
        .filter((descriptor: any) => !blockedSlugs.has(descriptor.slug))
        .map((descriptor: any) => {
          const viewerMembership = viewer && descriptor.currentUserMembership?.status === 'ACTIVE'
            ? {
                role: descriptor.currentUserMembership.role?.toLowerCase() || 'member',
                joinedAt: descriptor.currentUserMembership.joinedAt
              }
            : null;

          // Map visibility from RingHub format (PUBLIC/UNLISTED/PRIVATE) to ThreadStead format
          let visibility = 'public';
          if (descriptor.visibility === 'UNLISTED') {
            visibility = 'unlisted';
          } else if (descriptor.visibility === 'PRIVATE') {
            visibility = 'private';
          }

          // Map joinPolicy from RingHub format to ThreadStead joinType
          let joinType = 'open';
          if (descriptor.joinPolicy === 'CLOSED') {
            joinType = 'closed';
          } else if (descriptor.joinPolicy === 'INVITATION') {
            joinType = 'invite';
          } else if (descriptor.joinPolicy === 'APPLICATION') {
            joinType = 'application';
          }

          return {
            id: descriptor.id,
            name: descriptor.name,
            slug: descriptor.slug,
            description: descriptor.description,
            visibility,
            joinType,
            memberCount: descriptor.memberCount || 0,
            postCount: descriptor.postCount || 0,
            createdAt: descriptor.createdAt,
            curator: null, // Ring Hub doesn't include curator in list responses
            viewerMembership,
            badgeImageUrl: descriptor.badgeImageUrl,
            badgeImageHighResUrl: descriptor.badgeImageHighResUrl
          };
        });

      // Paging follows the hub's list, so a dropped (blocked) ring doesn't
      // make the next page repeat or skip one.
      const nextOffset = offset + result.rings.length;
      return res.json({
        threadRings: transformedRings,
        hasMore: nextOffset < result.total,
        total: result.total,
        nextOffset,
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
        badge: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            backgroundColor: true,
            textColor: true,
            templateId: true,
            imageUrl: true,
            isActive: true
          }
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
      // A ring can have no curator here (a Ring Hub mirror, or one whose
      // curator's account was deleted).
      const curatorHandle = ring.curator?.handles.find(h => h.host === "local")?.handle ||
        ring.curator?.handles[0]?.handle ||
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
        curator: ring.curator ? {
          handle: curatorHandle,
          displayName: ring.curator.profile?.displayName,
          avatarUrl: ring.curator.profile?.avatarUrl
        } : null,
        badge: ring.badge?.isActive ? ring.badge : null,
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