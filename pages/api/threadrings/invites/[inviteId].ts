import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { inviteId } = req.query;
  const { action } = req.body; // "accept" or "decline"

  if (typeof inviteId !== "string") {
    return res.status(400).json({ error: "Invalid invite ID" });
  }

  if (!action || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ error: "Action must be 'accept' or 'decline'" });
  }

  try {
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Find the invitation
    const invite = await db.threadRingInvite.findUnique({
      where: { id: inviteId },
      include: {
        threadRing: {
          select: {
            id: true,
            name: true,
            slug: true,
            memberCount: true
          }
        },
        inviter: {
          select: {
            id: true
          }
        }
      }
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Check if the viewer is the invitee
    if (invite.inviteeId !== viewer.id) {
      return res.status(403).json({ error: "You can only respond to your own invites" });
    }

    // Check if invite is still pending
    if (invite.status !== "pending") {
      return res.status(400).json({ error: "This invite has already been responded to" });
    }

    if (action === "accept") {
      // Check if user is already a member (edge case)
      const existingMembership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: invite.threadRingId,
            userId: viewer.id
          }
        }
      });

      if (existingMembership) {
        // Update invite status but don't create duplicate membership
        await db.threadRingInvite.update({
          where: { id: inviteId },
          data: { status: "accepted" }
        });

        return res.json({
          success: true,
          message: "You're already a member of this ThreadRing"
        });
      }

      // Accept the invite: create membership and update invite
      await db.$transaction([
        // Create membership
        db.threadRingMember.create({
          data: {
            threadRingId: invite.threadRingId,
            userId: viewer.id,
            role: "member"
          }
        }),
        // Update invite status
        db.threadRingInvite.update({
          where: { id: inviteId },
          data: { status: "accepted" }
        }),
        // Update ThreadRing member count
        db.threadRing.update({
          where: { id: invite.threadRingId },
          data: {
            memberCount: {
              increment: 1
            }
          }
        })
        // Note: No notification for accepted invites - keeping ThreadRing activity non-invasive
        // The inviter can see new members when they visit the ThreadRing page
      ]);

      return res.json({
        success: true,
        message: `Welcome to ${invite.threadRing.name}!`,
        threadRing: {
          slug: invite.threadRing.slug,
          name: invite.threadRing.name
        }
      });

    } else {
      // Decline the invite
      await db.threadRingInvite.update({
        where: { id: inviteId },
        data: { status: "declined" }
      });

      return res.json({
        success: true,
        message: "Invite declined"
      });
    }

  } catch (error) {
    console.error("Error handling ThreadRing invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}