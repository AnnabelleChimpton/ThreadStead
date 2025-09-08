import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { featureFlags } from "@/lib/utils/features/feature-flags";

// Note: Member role management is currently local-only
// Ring Hub doesn't expose member management APIs yet
// TODO: Integrate with Ring Hub member management when available

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // If Ring Hub is enabled, member management is not available
    if (featureFlags.ringhub()) {
      return res.status(501).json({ 
        error: "Member role management not available with Ring Hub",
        message: "Ring Hub member management is not yet supported"
      });
    }

    // Find the ThreadRing
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