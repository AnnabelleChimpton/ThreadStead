import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { getPublicRingHubClient, RingHubClientError } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";

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
      const publicClient = getPublicRingHubClient();
      if (publicClient) {
        let ring = null;
        try {
          ring = await publicClient.getRing(slug);
        } catch (lookupError) {
          // Can't tell whether this is a hub ring; keep the old local fallback.
          console.error("RingHub ring lookup failed in member management:", lookupError);
        }

        if (ring) {
          // This is a hub ring: the hub owns its memberships and roles, so a
          // hub failure is reported as-is — never written to the local mirror.
          try {
            // Role changes are the owner's. Removal the hub decides by the
            // signer's role: the owner removes anyone, a moderator plain members.
            if (req.method === "PUT") {
              const ownership = await db.ringHubOwnership.findUnique({
                where: { ringSlug: slug }
              });

              if (!ownership || ownership.ownerUserId !== viewer.id) {
                return res.status(403).json({ error: "Only ring owner can manage members" });
              }
            }

            // Get the target user's DID
            const targetUser = await db.user.findUnique({
              where: { id: userId },
              include: { handles: true }
            });

            if (!targetUser) {
              return res.status(404).json({ error: "User not found" });
            }

            // The hub knows members by their federation DID (UserDID), which can
            // differ from User.did (e.g. a migrated did:key).
            const userDid = await db.userDID.findUnique({
              where: { userId: targetUser.id },
              select: { did: true }
            });
            const targetDid = userDid?.did ?? targetUser.did;
            // Signed as the viewer: the hub authorizes by the caller's membership.
            const viewerClient = createAuthenticatedRingHubClient(viewer.id);

            if (req.method === "PUT") {
              // Update role
              const { role } = req.body;

              if (!role || !["member", "moderator"].includes(role)) {
                return res.status(400).json({ error: "Invalid role. Must be 'member' or 'moderator'" });
              }

              await viewerClient.updateMemberRole(slug, targetDid, role as 'member' | 'moderator');

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
              await viewerClient.removeMember(slug, targetDid);

              const memberHandle = targetUser.handles.find(h => h.host === SITE_NAME)?.handle ||
                targetUser.handles[0]?.handle ||
                "unknown";

              return res.json({
                success: true,
                message: `${memberHandle} has been removed from the ThreadRing`
              });
            }
          } catch (ringHubError) {
            console.error("RingHub error in member management:", ringHubError);
            // A 401 here means the hub rejected the owner's signing key — a hub-side
            // auth problem, not a logged-out viewer.
            if (
              ringHubError instanceof RingHubAuthError ||
              ringHubError instanceof RingHubUnavailableError ||
              (ringHubError instanceof RingHubClientError && ringHubError.status === 401)
            ) {
              return res.status(503).json({
                error: "We can't reach the ThreadRing hub right now. Try again in a minute.",
                degraded: true
              });
            }
            if (ringHubError instanceof RingHubClientError && ringHubError.status && ringHubError.status < 500) {
              return res.status(ringHubError.status).json({
                error: ringHubError.data?.message || ringHubError.message
              });
            }
            return res.status(502).json({ error: "The ThreadRing hub couldn't make that change. Try again in a minute." });
          }
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