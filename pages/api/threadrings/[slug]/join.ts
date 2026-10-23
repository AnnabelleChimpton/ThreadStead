import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { isUserBlockedFromThreadRing } from "@/lib/domain/threadrings/blocks";
import { withThreadRingSupport } from "@/lib/api/ringhub/ringhub-middleware";
import { AuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import { retryWithBackoff } from "@/lib/api/ringhub/ringhub-retry";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(
  withCsrfProtection(
    withThreadRingSupport(async function handler(
      req: NextApiRequest,
      res: NextApiResponse,
      system: 'ringhub' | 'local'
    ) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      try {
        const authenticatedClient = new AuthenticatedRingHubClient(viewer.id);

        // Retried: the hub registers a first-time actor on its first request,
        // and the join itself can need a second try.
        const joinResult = await retryWithBackoff(
          () => authenticatedClient.joinRing(slug as string),
          {
            maxRetries: 3,
            baseDelay: 500, // 500ms, 1s, 2s exponential backoff
          }
        );
        // So the page, the directory and the composer see the new member now
        forgetRingReads(slug, [viewer.id]);

        return res.json({
          success: true,
          message: "You're in.",
          role: "member",
          // The hub nests the badge: { membership, badge: { id, url } | null }.
          // The old membership.badgeId read was always undefined on the wire.
          badgeId: joinResult.badge?.id
        });

      } catch (ringHubError: any) {
        console.error("Ring Hub join error:", ringHubError);
        if (ringHubError.status === 404) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }
        if (ringHubError.status === 403) {
          if (ringHubError.data?.error === "Invitation required") {
            return res.status(403).json({
              error: "This ring needs an invite, and there isn't an open one for you. Invites last a week, so ask the ring host for a new one."
            });
          }
          return res.status(403).json({ error: ringHubError.data?.message || ringHubError.message || "Cannot join this ThreadRing" });
        }
        if (ringHubError.status === 400) {
          return res.status(400).json({ error: ringHubError.message || "Already a member or invalid request" });
        }
        if (ringHubError.status === 409) {
          // Already a member, or an application is waiting for review
          return res.status(409).json({ error: ringHubError.data?.message || ringHubError.message || "You're already in this ThreadRing" });
        }
        return res.status(500).json({
          error: "Failed to join ThreadRing via Ring Hub",
          details: ringHubError.message
        });
      }
    }

    // Original local database logic

    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true, 
        joinType: true,
        visibility: true,
        memberCount: true,
        curatorId: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if ThreadRing allows open joining
    if (threadRing.joinType !== "open") {
      return res.status(403).json({ 
        error: threadRing.joinType === "invite" 
          ? "This ThreadRing is invite-only" 
          : "This ThreadRing is closed to new members" 
      });
    }

    // Check if user is already a member
    const existingMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: viewer.id
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: "You are already a member of this ThreadRing" });
    }

    // Check if user is blocked from this ThreadRing
    const blockCheck = await isUserBlockedFromThreadRing(threadRing.id, viewer.id);
    if (blockCheck.isBlocked) {
      return res.status(403).json({ 
        error: blockCheck.reason 
          ? `You are blocked from this ThreadRing: ${blockCheck.reason}`
          : "You are blocked from this ThreadRing"
      });
    }

    // Create membership
    await db.$transaction([
      // Create the membership
      db.threadRingMember.create({
        data: {
          threadRingId: threadRing.id,
          userId: viewer.id,
          role: "member"
        }
      }),
      // Update ThreadRing member count
      db.threadRing.update({
        where: { id: threadRing.id },
        data: {
          memberCount: {
            increment: 1
          }
        }
      })
      // Note: No notification created - ThreadRing activity should be ambient, not invasive
    ]);

    return res.json({
      success: true,
      message: `Successfully joined ${threadRing.name}!`
    });

  } catch (error) {
    console.error("Error joining ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
    })
  )
);