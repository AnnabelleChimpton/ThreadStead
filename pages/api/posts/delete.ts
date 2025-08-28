import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { createAuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";
import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const { id, cap, reason } = (req.body || {}) as { id?: string; cap?: string; reason?: string };
  if (!id) return res.status(400).json({ error: "id required" });
  if (!cap) return res.status(401).json({ error: "capability required" });

  const ok = await requireAction("write:post", (resStr) => resStr === `user:${me.id}/posts`)(cap).catch(() => null);
  if (!ok) return res.status(403).json({ error: "invalid capability" });

  // Fetch the post with ThreadRing associations
  const post = await db.post.findUnique({ 
    where: { id },
    include: {
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
  
  if (!post || post.authorId !== me.id) return res.status(404).json({ error: "not found" });

  // If post is associated with ThreadRings, notify RingHub about the author removal
  let ringHubSynced = false;
  let affectedRings: string[] = [];
  
  if (post.threadRings.length > 0) {
    try {
      // Use user-authenticated client for author deletion
      const authenticatedClient = createAuthenticatedRingHubClient(me.id);
      
      // Use the global author removal endpoint
      // This will remove the post from ALL rings where it exists
      const ringHubResponse = await authenticatedClient.curatePost(
        id, 
        'remove',
        {
          reason: reason || "Author removed their own content"
        }
      );
        
      console.log(`Author ${me.primaryHandle || me.id} removed their post ${id} from RingHub:`, {
        isAuthorAction: ringHubResponse.isAuthorAction,
        globalRemoval: ringHubResponse.globalRemoval,
        affectedRings: ringHubResponse.affectedRings,
        totalRemoved: ringHubResponse.totalRemoved,
      });
      
      ringHubSynced = true;
      affectedRings = ringHubResponse.affectedRings?.map(r => r.slug) || [];
      
    } catch (ringHubError: any) {
      // Check if it's a permission error (author can only remove their own posts)
      if (ringHubError.status === 403) {
        console.error("RingHub rejected author removal - may not be the original author on RingHub:", {
          postId: id,
          error: ringHubError.message,
          status: ringHubError.status
        });
      } else if (ringHubError.status === 404) {
        console.error("RingHub could not find post for removal:", {
          postId: id,
          error: ringHubError.message,
          status: ringHubError.status
        });
      } else {
        console.error("Failed to remove post from RingHub:", {
          postId: id,
          error: ringHubError.message,
          status: ringHubError.status,
          fullError: ringHubError
        });
      }
      // Continue with local deletion even if RingHub sync fails
      console.error("Continuing with local deletion despite RingHub sync failure for post:", id);
    }
  }

  // Delete the post from local database (cascade will handle all associations)
  await db.post.delete({ where: { id } });
  
  res.json({ 
    ok: true,
    ringHubSynced,
    affectedRings,
    threadRingsRemoved: post.threadRings.map(ptr => ptr.threadRing.name),
  });
}
