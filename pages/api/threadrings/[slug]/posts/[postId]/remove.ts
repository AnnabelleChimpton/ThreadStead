import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug, postId } = req.query;
  const { reason, metadata } = req.body || {};
  
  if (typeof slug !== "string" || typeof postId !== "string") {
    return res.status(400).json({ error: "Invalid parameters" });
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
        postCount: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if viewer has moderation rights (curator or moderator)
    const viewerMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: viewer.id
        }
      }
    });

    const canModerate = viewerMembership && 
                       (viewerMembership.role === "curator" || 
                        viewerMembership.role === "moderator");

    if (!canModerate) {
      return res.status(403).json({ error: "Only curators and moderators can remove posts" });
    }

    // Find the post association
    const postAssociation = await db.postThreadRing.findFirst({
      where: {
        postId: postId,
        threadRingId: threadRing.id
      }
    });

    if (!postAssociation) {
      return res.status(404).json({ error: "Post is not associated with this ThreadRing" });
    }

    // Sync with RingHub for ring-specific removal
    const ringHubClient = getRingHubClient();
    let ringHubResponse = null;
    
    if (ringHubClient) {
      try {
        // This is a moderator action, so it's ring-specific
        // The remove action will only affect this specific ring
        ringHubResponse = await ringHubClient.curatePost(
          postId,
          'remove',
          {
            reason: reason || `Removed by ${viewerMembership.role}`,
            metadata: metadata || {}
          }
        );
      } catch (ringHubError) {
        // Log the error but continue with local removal
        console.error("Failed to sync removal with RingHub:", ringHubError);
        console.error("Continuing with local removal despite RingHub sync failure");
      }
    }

    // Remove the association and update count locally
    await db.$transaction([
      // Delete the association
      db.postThreadRing.delete({
        where: {
          id: postAssociation.id
        }
      }),
      // Update ThreadRing post count
      db.threadRing.update({
        where: { id: threadRing.id },
        data: {
          postCount: {
            decrement: 1
          }
        }
      })
    ]);

    return res.json({
      success: true,
      message: `Post removed from ${threadRing.name}`,
      ringSpecific: true,
      ringHubSynced: !!ringHubResponse,
      reason: reason
    });

  } catch (error) {
    console.error("Error removing post from ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(withCsrfProtection(handler));