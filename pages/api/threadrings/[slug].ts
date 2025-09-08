import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { filterBlockedUsers } from "@/lib/domain/threadrings/blocks";
import { withThreadRingSupport } from "@/lib/api/ringhub/ringhub-middleware";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { transformRingDescriptorToThreadRing } from "@/lib/api/ringhub/ringhub-transformers";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      const client = getRingHubClient();
      if (!client) {
        return res.status(500).json({ error: "Ring Hub client not configured" });
      }

      const ringDescriptor = await client.getRing(slug);
      
      if (!ringDescriptor) {
        return res.status(404).json({ error: "ThreadRing not found" });
      }

      // Transform Ring Hub descriptor to ThreadRing format
      // Note: We'll need to fetch members separately if needed
      const ring = transformRingDescriptorToThreadRing(ringDescriptor);
      
      // For now, return a simplified response matching the expected format
      // Members will be fetched separately via the members endpoint
      return res.status(200).json({ 
        ring: {
          ...ring,
          curator: null, // Will be populated from members with role=curator
          members: [] // Members fetched separately via /api/threadrings/[slug]/members
        }
      });
    }

    // Original local ThreadRing logic
    const ring = await db.threadRing.findUnique({
      where: { slug },
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
        members: {
          include: {
            user: {
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
          },
          orderBy: [
            { role: "desc" }, // Curator first, then moderators, then members
            { joinedAt: "asc" },
          ],
        },
      },
    });

    if (!ring) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Filter out blocked users from member list
    if (ring.members.length > 0) {
      const memberUserIds = ring.members.map(member => member.user.id);
      const allowedUserIds = await filterBlockedUsers(ring.id, memberUserIds);
      ring.members = ring.members.filter(member => allowedUserIds.includes(member.user.id));
    }

    res.status(200).json({ ring });
  } catch (error: any) {
    console.error("ThreadRing fetch error:", error);
    res.status(500).json({ error: "Failed to fetch ThreadRing" });
  }
});