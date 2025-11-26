import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { isUserBlockedFromThreadRing } from "@/lib/domain/threadrings/blocks";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const { username } = req.body;
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username is required" });
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

            // Get viewer's membership to check role
            const members = await client.getRingMembers(slug);
            const viewerDid = viewer.did;
            const viewerMembership = members.members.find(m => m.actorDid === viewerDid);

            const canInvite = viewerMembership &&
              (viewerMembership.role === 'owner' || viewerMembership.role === 'moderator');

            if (!canInvite) {
              return res.status(403).json({ error: "Only curators and moderators can send invites" });
            }

            // Find the invitee's DID
            const handle = await db.handle.findFirst({
              where: {
                handle: username.toLowerCase().replace(/^@/, ""),
                host: SITE_NAME
              },
              include: { user: true }
            });

            if (!handle) {
              return res.status(404).json({ error: "User not found" });
            }

            const inviteeDid = handle.user.did;

            // Send invite via RingHub
            const result = await client.inviteMember(slug, inviteeDid);

            return res.json({
              success: true,
              message: `Invite sent to @${username}`
            });
          }
        } catch (ringHubError) {
          console.error("RingHub error in invite:", ringHubError);
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
        joinType: true,
        curatorId: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if viewer can invite (curator or moderator)
    const viewerMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: viewer.id
        }
      }
    });

    const canInvite = viewerMembership &&
      (viewerMembership.role === "curator" ||
        viewerMembership.role === "moderator");

    if (!canInvite) {
      return res.status(403).json({ error: "Only curators and moderators can send invites" });
    }

    // Find the user to invite
    const handle = await db.handle.findFirst({
      where: {
        handle: username.toLowerCase().replace(/^@/, ""),
        host: SITE_NAME
      },
      include: { user: true }
    });

    if (!handle) {
      return res.status(404).json({ error: "User not found" });
    }

    const inviteeId = handle.user.id;

    // Check if user is already a member
    const existingMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: inviteeId
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: "User is already a member of this ThreadRing" });
    }

    // Check if user is blocked from this ThreadRing
    const blockCheck = await isUserBlockedFromThreadRing(threadRing.id, inviteeId);
    if (blockCheck.isBlocked) {
      return res.status(403).json({
        error: blockCheck.reason
          ? `Cannot invite blocked user: ${blockCheck.reason}`
          : "Cannot invite blocked user"
      });
    }

    // Check if there's already a pending invite
    const existingInvite = await db.threadRingInvite.findFirst({
      where: {
        threadRingId: threadRing.id,
        inviteeId: inviteeId,
        status: "pending"
      }
    });

    if (existingInvite) {
      return res.status(400).json({ error: "User already has a pending invite to this ThreadRing" });
    }

    // Create the invitation
    const invite = await db.threadRingInvite.create({
      data: {
        threadRingId: threadRing.id,
        inviterId: viewer.id,
        inviteeId: inviteeId,
        status: "pending"
      }
    });

    // Create notification for the invitee
    await db.notification.create({
      data: {
        recipientId: inviteeId,
        actorId: viewer.id,
        type: "threadring_invite",
        data: {
          threadRingId: threadRing.id,
          threadRingName: threadRing.name,
          threadRingSlug: slug,
          inviteId: invite.id
        }
      }
    });

    return res.json({
      success: true,
      message: `Invite sent to @${username}`
    });

  } catch (error) {
    console.error("Error creating ThreadRing invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(withCsrfProtection(handler));