import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { getPublicRingHubClient, RingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { readAllRingMembers } from "@/lib/api/ringhub/ring-members";
import { HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { db } from "@/lib/config/database/connection";
import { cached } from "@/lib/api/ringhub/ringhub-cache";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const viewer = await getSessionUser(req);

    // If user is not authenticated, use public membership info endpoint
    if (!viewer) {        
      try {
        const publicClient = getPublicRingHubClient();

        // Get membership info from public endpoint (cached, SWR)
        const membershipInfo = await cached(
          `membership-info:${slug}`,
          30_000,
          5 * 60_000,
          () => publicClient.getRingMembershipInfo(slug as string)
        );

        // Transform membership info to member format for display
        const transformedMembers = [];

        // Add owner
        if (membershipInfo.owner) {
          const ownerDisplayName = membershipInfo.owner.actorName ||
                                  membershipInfo.owner.actorDid.split(':').pop() || 'Owner'

          transformedMembers.push({
            id: `owner-${membershipInfo.owner.actorDid}`,
            userId: 'external',
            role: 'curator',
            joinedAt: membershipInfo.owner.joinedAt,
            user: {
              id: 'external',
              handles: [],
              profile: {
                displayName: ownerDisplayName,
                avatarUrl: null
              }
            }
          });
        }

        // Add moderators
        membershipInfo.moderators.forEach((mod, index) => {
          const modDisplayName = mod.actorName ||
                                mod.actorDid.split(':').pop() || 'Moderator'

          transformedMembers.push({
            id: `mod-${index}-${mod.actorDid}`,
            userId: 'external',
            role: 'moderator',
            joinedAt: mod.joinedAt,
            user: {
              id: 'external',
              handles: [],
              profile: {
                displayName: modDisplayName,
                avatarUrl: null
              }
            }
          });
        });
        
        return res.json({
          members: transformedMembers,
          total: membershipInfo.memberCount,
          limit: 100,
          offset: 0,
          hasMore: false,
          isPublicInfo: true // Flag to indicate limited info
        });
        
      } catch (error) {
        console.error('Failed to fetch public membership info:', error);
        if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
          return res.status(503).json({ error: 'hub_unavailable', degraded: true });
        }
        return res.status(500).json({
          error: "Failed to fetch membership information"
        });
      }
    }
    
    
    try {
      // Create user-authenticated Ring Hub client
      const authenticatedClient = await createAuthenticatedRingHubClient(viewer.id);
      
      // Every member, signed as the viewer (cached, SWR). One hub page is only the
      // newest 20, and the ring page reads the viewer's own role from this list.
      const membersResponse = await cached(
        `ring-members-all:${viewer.id}:${slug}`,
        30_000,
        5 * 60_000,
        async () => {
          const read = await readAllRingMembers(authenticatedClient, slug, {
            deadlineMs: RingHubClient.REQUEST_TIMEOUT_MS
          });
          // Thrown, not cached: the cache keeps serving a stale list if it has one.
          if (read === HUB_TIMEOUT) throw new RingHubUnavailableError('Ring Hub members read failed');
          return read;
        }
      );

      // Transform Ring Hub member format with batched DID/user resolution (no N+1).
      const { transformRingMembersBatchWithUserResolution } = await import('@/lib/api/ringhub/ringhub-transformers')

      const resolvedMembers = await transformRingMembersBatchWithUserResolution(
        membersResponse.members || [],
        slug as string,
        db,
        viewer.id
      )

      const transformedMembers = resolvedMembers.map(resolvedMember => ({
        id: resolvedMember.id,
        userId: resolvedMember.userId,
        role: resolvedMember.role,
        joinedAt: resolvedMember.joinedAt,
        user: {
          id: resolvedMember.user.id,
          handles: resolvedMember.user.handles,
          profileUrl: resolvedMember.user.profileUrl,
          profile: {
            displayName: resolvedMember.user.displayName,
            avatarUrl: resolvedMember.user.avatarUrl
          }
        }
      }));

      return res.json({
        members: transformedMembers,
        total: membersResponse.total,
        limit: transformedMembers.length,
        offset: 0,
        // Only when the page cap or deadline cut the read short
        hasMore: !membersResponse.complete
      });

    } catch (ringHubError) {
      console.error('Ring Hub member fetch failed:', ringHubError);
      if (ringHubError instanceof RingHubAuthError || ringHubError instanceof RingHubUnavailableError) {
        return res.status(503).json({ error: 'hub_unavailable', degraded: true });
      }
      return res.status(500).json({
        error: "Failed to fetch members from Ring Hub"
      });
    }

  } catch (error) {
    console.error("Error fetching ThreadRing members:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}