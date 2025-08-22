import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { getRingHubClient } from "@/lib/ringhub-client";

const prisma = new PrismaClient();

export default withThreadRingSupport(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const { scope = "ring" } = req.query; // "ring" or "lineage"

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const viewer = await getSessionUser(req);

    // For Ring Hub, we don't have local member data, so return not found
    if (system === 'ringhub') {
      const client = getRingHubClient();
      if (!client) {
        return res.status(500).json({ error: "Ring Hub client not configured" });
      }

      // Verify ring exists in Ring Hub
      const ringDescriptor = await client.getRing(slug as string);
      if (!ringDescriptor) {
        return res.status(404).json({ error: "ThreadRing not found" });
      }

      // Ring Hub doesn't provide member discovery features yet
      return res.status(404).json({ 
        error: "Member discovery not available for Ring Hub rings",
        message: "Random member discovery requires local membership data"
      });
    }

    // Original local database logic
    // Find the ThreadRing
    const ring = await prisma.threadRing.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                primaryHandle: true,
                createdAt: true,
                _count: {
                  select: {
                    posts: true,
                    followers: true
                  }
                },
                profile: {
                  select: {
                    displayName: true,
                    bio: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!ring) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if ThreadRing is accessible to viewer
    if (ring.visibility === "private") {
      const viewerMembership = await prisma.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: ring.id,
            userId: viewer?.id || ""
          }
        }
      });

      if (!viewerMembership) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    let candidateMembers = ring.members;

    // If scope is "lineage", expand to include family tree members
    if (scope === "lineage" && ring.lineagePath) {
      // Get members from parent and sibling rings
      const familyRingIds = ring.lineagePath.split(',').filter(Boolean);
      familyRingIds.push(ring.id); // Include current ring

      // Also get direct children
      const childRings = await prisma.threadRing.findMany({
        where: { parentId: ring.id },
        select: { id: true }
      });
      familyRingIds.push(...childRings.map(r => r.id));

      // Get all family members
      const familyMembers = await prisma.threadRingMember.findMany({
        where: {
          threadRingId: { in: familyRingIds }
        },
        include: {
          user: {
            select: {
              id: true,
              primaryHandle: true,
              createdAt: true,
              _count: {
                select: {
                  posts: true,
                  followers: true
                }
              },
              profile: {
                select: {
                  displayName: true,
                  bio: true,
                  avatarUrl: true
                }
              }
            }
          },
          threadRing: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      candidateMembers = familyMembers;
    }

    // Filter out the viewer themselves
    const eligibleMembers = candidateMembers.filter(m => 
      viewer ? m.user.id !== viewer.id : true
    );

    if (eligibleMembers.length === 0) {
      return res.json({
        success: true,
        member: null,
        message: "No members available for discovery",
        scope,
        totalCandidates: 0
      });
    }

    // Weighted random selection - prefer more active members
    const weightedMembers = eligibleMembers.map(member => {
      let weight = 1;
      
      // Weight by post count (more posts = higher chance)
      weight += Math.min(member.user._count.posts * 0.1, 5);
      
      // Weight by follower count (more followers = higher chance)
      weight += Math.min(member.user._count.followers * 0.05, 3);
      
      // Weight by recent activity (newer members = slightly higher chance)
      const daysSinceJoined = (Date.now() - new Date(member.user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceJoined < 30) weight += 1; // Boost for new members
      
      return { member, weight };
    });

    // Select random member based on weights
    const totalWeight = weightedMembers.reduce((sum, wm) => sum + wm.weight, 0);
    let randomValue = Math.random() * totalWeight;
    
    let selectedMember = weightedMembers[0].member;
    for (const weightedMember of weightedMembers) {
      randomValue -= weightedMember.weight;
      if (randomValue <= 0) {
        selectedMember = weightedMember.member;
        break;
      }
    }

    // Build the response
    const memberProfile = {
      id: selectedMember.user.id,
      handle: selectedMember.user.primaryHandle,
      displayName: selectedMember.user.profile?.displayName || null,
      bio: selectedMember.user.profile?.bio || null,
      avatarUrl: selectedMember.user.profile?.avatarUrl || null,
      joinedAt: selectedMember.joinedAt,
      role: selectedMember.role,
      stats: {
        posts: selectedMember.user._count.posts,
        followers: selectedMember.user._count.followers
      },
      // Include ring info for lineage scope
      ...(scope === "lineage" && 'threadRing' in selectedMember && selectedMember.threadRing ? {
        foundInRing: {
          id: (selectedMember.threadRing as any).id,
          name: (selectedMember.threadRing as any).name,
          slug: (selectedMember.threadRing as any).slug
        }
      } : {})
    };

    return res.json({
      success: true,
      member: memberProfile,
      scope,
      totalCandidates: eligibleMembers.length,
      discoveryType: scope === "lineage" ? "family_tree" : "ring_member"
    });

  } catch (error) {
    console.error("Random member discovery error:", error);
    return res.status(500).json({
      error: "Failed to discover random member",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await prisma.$disconnect();
  }
});