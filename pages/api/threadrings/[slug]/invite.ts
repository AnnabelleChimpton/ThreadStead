import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Find the ThreadRing
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