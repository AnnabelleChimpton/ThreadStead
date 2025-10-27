import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug, postId } = req.query;
  
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
        name: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if viewer is curator (only curators can pin posts)
    const viewerMembership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: viewer.id
        }
      }
    });

    if (!viewerMembership || viewerMembership.role !== "curator") {
      return res.status(403).json({ error: "Only curators can pin/unpin posts" });
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

    const action = req.method === "POST" ? "pin" : "unpin";
    
    // Sync with RingHub
    const ringHubClient = getRingHubClient();
    let ringHubResponse = null;
    
    if (ringHubClient) {
      try {
        ringHubResponse = await ringHubClient.curatePost(
          postId,
          action,
          {
            reason: `${action === 'pin' ? 'Pinned' : 'Unpinned'} by curator`
          }
        );
        
        console.log(`Curator ${action}ned post ${postId} in ring ${slug}:`, {
          ringSpecific: ringHubResponse.ringSpecific,
          moderator: ringHubResponse.moderator
        });
      } catch (ringHubError) {
        // Log the error but continue with local operation
        console.error(`Failed to sync ${action} with RingHub:`, ringHubError);
        console.error(`Continuing with local ${action} despite RingHub sync failure`);
      }
    } else {
      console.log("RingHub client not available, skipping RingHub sync");
    }

    if (req.method === "POST") {
      // Pin the post locally
      await db.postThreadRing.update({
        where: {
          id: postAssociation.id
        },
        data: {
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: viewer.id
        }
      });

      return res.json({
        success: true,
        message: "Post pinned successfully",
        isPinned: true,
        ringHubSynced: !!ringHubResponse
      });

    } else {
      // Unpin the post locally (DELETE method)
      await db.postThreadRing.update({
        where: {
          id: postAssociation.id
        },
        data: {
          isPinned: false,
          pinnedAt: null,
          pinnedBy: null
        }
      });

      return res.json({
        success: true,
        message: "Post unpinned successfully",
        isPinned: false,
        ringHubSynced: !!ringHubResponse
      });
    }

  } catch (error) {
    console.error("Error pinning/unpinning post:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(withCsrfProtection(handler));