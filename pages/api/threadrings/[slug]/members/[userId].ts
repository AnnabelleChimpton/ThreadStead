import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "DELETE") {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug, userId } = req.query;

  if (typeof slug !== "string" || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  try {
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Try RingHub first if enabled
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          const ring = await client.getRing(slug);

          if (ring) {
            // This is a RingHub ring - use RingHub API

            // Check if viewer owns this ring locally
            const ownership = await db.ringHubOwnership.findUnique({
              where: { ringSlug: slug }
            });

            if (!ownership || ownership.ownerUserId !== viewer.id) {
              return res.status(403).json({ error: "Only ring owner can manage members" });
            }

            // Get the target user's DID
            const targetUser = await db.user.findUnique({
              where: { id: userId },
              include: { handles: true }
            });

            if (!targetUser) {
              return res.status(404).json({ error: "User not found" });
            }

            const targetDid = targetUser.did;

            if (req.method === "PUT") {
              // Update role
              const { role } = req.body;

              if (!role || !["member", "moderator"].includes(role)) {
                return res.status(400).json({ error: "Invalid role. Must be 'member' or 'moderator'" });
              }

              await client.updateMemberRole(slug, targetDid, role as 'member' | 'moderator');

              const memberHandle = targetUser.handles.find(h => h.host === SITE_NAME)?.handle ||
                targetUser.handles[0]?.handle ||
                "unknown";

              return res.json({
                success: true,
                message: `${memberHandle} has been ${role === "moderator" ? "promoted to moderator" : "set as member"}`,
                newRole: role
              });

            } else {
              // Remove member (DELETE)
              await client.removeMember(slug, targetDid);

              const memberHandle = targetUser.handles.find(h => h.host === SITE_NAME)?.handle ||
                targetUser.handles[0]?.handle ||
                "unknown";

              return res.json({
                success: true,
                message: `${memberHandle} has been removed from the ThreadRing`
              });
            }
          }
        } catch (ringHubError) {
          console.error("RingHub error in member management:", ringHubError);
          // Fall through to local database
        }
      }
    }

    // Fall back to local ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        curatorId: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if viewer has management rights (curator only for role changes)
    const viewerMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: viewer.id
        }
      }
    });

    const canManage = viewerMembership && viewerMembership.role === "curator";

    if (!canManage) {
      return res.status(403).json({ error: "Only curators can manage member roles" });
    }

    // Find the target member
    const targetMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: userId
        }
      },
      include: {
        user: {
          include: {
            handles: {
              select: {
                handle: true,
                host: true,
              },
            },
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        }
      }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: "User is not a member of this ThreadRing" });
    }

    // Prevent curator from modifying their own role or removing themselves
    if (userId === viewer.id) {
      return res.status(400).json({ error: "Cannot modify your own role or remove yourself" });
    }

    if (req.method === "PUT") {
      // Update role
      const { role } = req.body;

      if (!role || !["member", "moderator", "curator"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Prevent creating multiple curators
      if (role === "curator") {
        return res.status(400).json({ error: "Cannot promote to curator. Transfer ownership instead." });
      }

      await db.threadRingMember.update({
        where: {
          threadRingId_userId: {
            threadRingId: threadRing.id,
            userId: userId
          }
        },
        data: {
          role: role as any
        }
      });

      const memberHandle = targetMembership.user.handles.find(h => h.host === "local")?.handle ||
        targetMembership.user.handles[0]?.handle ||
        "unknown";

      return res.json({
        success: true,
        message: `${memberHandle} has been ${role === "moderator" ? "promoted to moderator" : "set as member"}`,
        newRole: role
      });

    } else {
      // Remove member (DELETE)
      await db.$transaction([
        // Delete the membership
        db.threadRingMember.delete({
          where: {
            threadRingId_userId: {
              threadRingId: threadRing.id,
              userId: userId
            }
          }
        }),
        // Update ThreadRing member count
        db.threadRing.update({
          where: { id: threadRing.id },
          data: {
            memberCount: {
              decrement: 1
            }
          }
        })
      ]);

      const memberHandle = targetMembership.user.handles.find(h => h.host === "local")?.handle ||
        targetMembership.user.handles[0]?.handle ||
        "unknown";

      return res.json({
        success: true,
        message: `${memberHandle} has been removed from the ThreadRing`
      });
    }

  } catch (error) {
    console.error("Error managing member:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(withCsrfProtection(handler));