import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { featureFlags } from "@/lib/feature-flags";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { db } from "@/lib/db";

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
    
    // Use Ring Hub if enabled
    if (featureFlags.ringhub()) {
      // If user is not authenticated, use public membership info endpoint
      if (!viewer) {
        console.log('Fetching Ring Hub membership info for non-authenticated user...');
        
        try {
          const publicClient = getPublicRingHubClient();
          if (!publicClient) {
            return res.status(500).json({ error: "Ring Hub client not configured" });
          }
          
          // Get membership info from public endpoint
          const membershipInfo = await publicClient.getRingMembershipInfo(slug as string);
          
          console.log(`Fetched membership info: ${membershipInfo.memberCount} members`);
          
          // Transform membership info to member format for display
          const transformedMembers = [];
          
          // Add owner
          if (membershipInfo.owner) {
            transformedMembers.push({
              id: `owner-${membershipInfo.owner.actorDid}`,
              userId: 'external',
              role: 'curator',
              joinedAt: membershipInfo.owner.joinedAt,
              user: {
                id: 'external',
                handles: [],
                profile: {
                  displayName: membershipInfo.owner.actorName || membershipInfo.owner.actorDid.split(':').pop() || 'Owner',
                  avatarUrl: null
                }
              }
            });
          }
          
          // Add moderators
          membershipInfo.moderators.forEach((mod, index) => {
            transformedMembers.push({
              id: `mod-${index}-${mod.actorDid}`,
              userId: 'external',
              role: 'moderator',
              joinedAt: mod.joinedAt,
              user: {
                id: 'external',
                handles: [],
                profile: {
                  displayName: mod.actorName || mod.actorDid.split(':').pop() || 'Moderator',
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
          return res.status(500).json({ 
            error: "Failed to fetch membership information",
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Authenticated user path
      console.log('Fetching Ring Hub members with user authentication...');
      
      try {
        // Create user-authenticated Ring Hub client
        const authenticatedClient = await createAuthenticatedRingHubClient(viewer.id);
        
        // Fetch members using user's DID authentication
        const membersResponse = await authenticatedClient.getRingMembers(slug);
        
        console.log(`Fetched ${membersResponse.members?.length || 0} members from Ring Hub for user ${viewer.id}`);
        
        // Transform Ring Hub member format with proper user resolution
        const { transformRingMemberWithUserResolution } = await import('@/lib/api/ringhub/ringhub-transformers')
        
        const transformedMembers = await Promise.all(
          (membersResponse.members || []).map(async (member) => {
            console.log(`Transforming member: ${member.actorDid}`)
            
            const resolvedMember = await transformRingMemberWithUserResolution(
              member,
              slug as string,
              db
            )
            
            console.log(`Resolved to: ${resolvedMember.user.displayName} (userId: ${resolvedMember.userId})`)
            
            // Convert to API response format
            return {
              id: resolvedMember.id,
              userId: resolvedMember.userId,
              role: resolvedMember.role,
              joinedAt: resolvedMember.joinedAt,
              user: {
                id: resolvedMember.user.id,
                handles: resolvedMember.user.handles,
                profile: {
                  displayName: resolvedMember.user.displayName,
                  avatarUrl: resolvedMember.user.avatarUrl
                }
              }
            }
          })
        );

        return res.json({
          members: transformedMembers,
          total: membersResponse.total,
          limit: membersResponse.limit,
          offset: membersResponse.offset,
          hasMore: membersResponse.hasMore
        });

      } catch (ringHubError) {
        console.error('Ring Hub member fetch failed:', ringHubError);
        return res.status(500).json({ 
          error: "Failed to fetch members from Ring Hub",
          message: ringHubError instanceof Error ? ringHubError.message : 'Unknown error'
        });
      }
    }

    // Local database fallback
    console.log('Using local database for member fetching...');
    
    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        visibility: true,
        curatorId: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check access permissions for private rings
    if (threadRing.visibility === "private") {
      if (!viewer) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const membership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: threadRing.id,
            userId: viewer.id
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Get members from local database
    const members = await db.threadRingMember.findMany({
      where: {
        threadRingId: threadRing.id
      },
      include: {
        user: {
          include: {
            handles: {
              where: { host: process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, '') || 'localhost:3000' },
              take: 1
            },
            profile: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    const transformedMembers = members.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        id: member.user.id,
        handles: member.user.handles,
        profile: member.user.profile
      }
    }));

    return res.json({
      members: transformedMembers,
      total: transformedMembers.length,
      limit: 100, // Default limit for local
      offset: 0,
      hasMore: false
    });

  } catch (error) {
    console.error("Error fetching ThreadRing members:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}