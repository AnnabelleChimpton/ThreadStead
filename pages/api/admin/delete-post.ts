import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { requireAdmin } from "@/lib/auth/server";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ error: "Post ID is required" });
  }

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            primaryHandle: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        threadRings: {
          include: {
            threadRing: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // If post is associated with ThreadRings, notify RingHub about the removal
    if (post.threadRings.length > 0) {
      const ringHubClient = getRingHubClient();
      
      if (ringHubClient) {
        try {
          // Use the global author removal endpoint
          // This will remove the post from ALL rings where it exists
          const ringHubResponse = await ringHubClient.curatePost(
            postId, 
            'remove',
            {
              reason: `Post deleted by admin: ${adminUser.primaryHandle || adminUser.id}`
            }
          );
        } catch (ringHubError: any) {
          // Log the error but continue with local deletion
          // We don't want to block local deletion if RingHub is unavailable
          console.error("Failed to remove post from RingHub:", {
            postId: postId,
            error: ringHubError.message,
            status: ringHubError.status,
            fullError: ringHubError
          });
          console.error("Continuing with local deletion despite RingHub sync failure for post:", postId);
        }
      }
    }

    // Delete the post from local database (cascade will handle PostThreadRing associations)
    await db.post.delete({
      where: { id: postId },
    });

    res.json({ 
      success: true,
      deletedPost: {
        id: post.id,
        author: post.author.profile?.displayName || post.author.primaryHandle || "Unknown",
        threadRingsRemoved: post.threadRings.map(ptr => ptr.threadRing.name),
      },
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));