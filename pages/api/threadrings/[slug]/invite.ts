import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { isUserBlockedFromThreadRing } from "@/lib/domain/threadrings/blocks";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { getRingHubClient, RingHubClient, RingHubClientError } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { readAllRingMembers } from "@/lib/api/ringhub/ring-members";
import { HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { activeUserWhere } from "@/lib/domain/users/moderation";

const HUB_UNREACHABLE = "We can't reach the ThreadRing hub right now. Try again in a minute.";

/**
 * Invite someone to a hub ring, signed as the viewer. The hub knows people by
 * their federation DID (UserDID), which differs from User.did, and authorizes
 * the invite by the signer's own membership.
 *
 * The hub has no way to list someone's invitations, so the notification is
 * how the invitee finds out. Accepting is joining the ring: the hub's /join
 * uses up the invitation.
 */
async function inviteOnHub(
  ring: { slug: string; name: string },
  viewer: { id: string; did: string },
  username: string,
  res: NextApiResponse
) {
  const slug = ring.slug;
  try {
    // Someone on either side of a block, or a suspended or banned account,
    // looks the same as no account at all.
    const handle = await db.handle.findFirst({
      where: {
        handle: username.toLowerCase().replace(/^@/, ""),
        host: SITE_NAME,
        user: {
          AND: [
            activeUserWhere(),
            { blocksCreated: { none: { blockedUserId: viewer.id } } },
            { blocksReceived: { none: { blockerId: viewer.id } } },
          ],
        },
      },
      include: { user: { select: { id: true, did: true, userDID: { select: { did: true } } } } }
    });

    if (!handle) {
      return res.status(404).json({ error: "User not found" });
    }

    const viewerClient = createAuthenticatedRingHubClient(viewer.id);
    const viewerDid = (await db.userDID.findUnique({
      where: { userId: viewer.id },
      select: { did: true }
    }))?.did ?? viewer.did;

    // Every page: the hub lists members newest first, 20 by default, and the
    // curator usually joined first.
    const read = await readAllRingMembers(viewerClient, slug, {
      deadlineMs: RingHubClient.REQUEST_TIMEOUT_MS
    });
    if (read === HUB_TIMEOUT) {
      return res.status(503).json({ error: HUB_UNREACHABLE, degraded: true });
    }

    const viewerMembership = read.members.find(m => m.actorDid === viewerDid);
    const canInvite = viewerMembership?.role === "owner" || viewerMembership?.role === "moderator";
    // A list cut short might just be missing the viewer; the hub checks again either way.
    if (!canInvite && read.complete) {
      return res.status(403).json({ error: "Only curators and moderators can send invites" });
    }

    const inviteeDid = handle.user.userDID?.did ?? handle.user.did;
    const { invitation } = await viewerClient.inviteMember(slug, inviteeDid);

    try {
      await db.notification.create({
        data: {
          recipientId: handle.user.id,
          actorId: viewer.id,
          type: "threadring_invite",
          data: {
            source: "ringhub",
            threadRingSlug: slug,
            threadRingName: ring.name,
            invitationId: invitation.id,
            expiresAt: invitation.expiresAt
          }
        }
      });
    } catch (notifyError) {
      // The hub invite stands, and joining still works; they just won't hear about it.
      console.error("Hub invite sent but the notification failed:", notifyError);
    }

    return res.json({
      success: true,
      message: `Invite sent to @${username}`
    });
  } catch (ringHubError) {
    console.error("RingHub error in invite:", ringHubError);
    // A 401 here means the hub rejected the viewer's signing key — a hub-side
    // auth problem, not a logged-out viewer.
    if (
      ringHubError instanceof RingHubAuthError ||
      ringHubError instanceof RingHubUnavailableError ||
      (ringHubError instanceof RingHubClientError && ringHubError.status === 401)
    ) {
      return res.status(503).json({ error: HUB_UNREACHABLE, degraded: true });
    }
    if (ringHubError instanceof RingHubClientError && ringHubError.status && ringHubError.status < 500) {
      return res.status(ringHubError.status).json({
        error: ringHubError.data?.message || ringHubError.message
      });
    }
    return res.status(502).json({ error: "The ThreadRing hub couldn't send that invite. Try again in a minute." });
  }
}

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
            // This is a hub ring: the hub owns its memberships and invitations,
            // so a hub failure is reported as-is — never written to the local mirror.
            return await inviteOnHub({ slug, name: ring.name }, viewer, username, res);
          }
        } catch (ringHubError) {
          console.error("RingHub error in invite:", ringHubError);
          // Can't tell whether this is a hub ring; keep the old local fallback.
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