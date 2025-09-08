import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { getSessionUser } from "@/lib/auth/server";
import { requireAction } from "@/lib/domain/users/capabilities";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const { id, cap, reason } = (req.body || {}) as { id?: string; cap?: string; reason?: string };
  if (!id) return res.status(400).json({ error: "id required" });
  if (!cap) return res.status(401).json({ error: "capability required" });

  const ok = await requireAction("write:post", (resStr) => resStr === `user:${me.id}/posts`)(cap).catch(() => null);
  if (!ok) return res.status(403).json({ error: "invalid capability" });

  // Fetch the post with ThreadRing associations and author data
  const post = await db.post.findUnique({ 
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          primaryHandle: true,
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
  
  if (!post || post.authorId !== me.id) return res.status(404).json({ error: "not found" });

  // If post is associated with ThreadRings, notify RingHub about the author removal
  let ringHubSynced = false;
  let affectedRingsResult: string[] = [];
  
  if (post.threadRings.length > 0) {
    try {
      // Use user-authenticated client for author deletion
      const authenticatedClient = createAuthenticatedRingHubClient(me.id);
      
      let totalRemovedCount = 0;
      const affectedRings: string[] = [];
      
      // Check if we have stored ThreadRing post IDs
      const threadRingPostIds = post.threadRingPostIds as Record<string, string> || {};
      
      for (const threadRingAssociation of post.threadRings) {
        try {
          const ringSlug = threadRingAssociation.threadRing.slug;
          const threadRingPostId = threadRingPostIds[ringSlug];
          
          if (threadRingPostId) {
            // Use the stored database UUID directly
            console.log(`🎯 Using stored ThreadRing post ID ${threadRingPostId} for ring ${ringSlug}`);
            
            const ringHubResponse = await authenticatedClient.curatePost(
              threadRingPostId, 
              'remove',
              {
                reason: reason || "Author removed their own content"
              }
            );
            
            console.log(`✅ Removed post from RingHub ring ${ringSlug}:`, {
              threadSteadPostId: id,
              threadRingPostId: threadRingPostId,
              ringSlug
            });
            
            totalRemovedCount++;
            affectedRings.push(ringSlug);
          } else {
            // Fallback to old URI matching method for posts created before this fix
            console.warn(`❌ No stored ThreadRing post ID for ring ${ringSlug}, falling back to URI matching`);
            
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const postUri = `${baseUrl}/resident/${post.author.primaryHandle}/post/${id}`;
            
            const ringPosts = await authenticatedClient.getRingFeed(ringSlug);
            const matchingPostRef = ringPosts.posts.find((postRef: any) => 
              postRef.uri === postUri
            );
            
            if (matchingPostRef && matchingPostRef.id) {
              const ringHubResponse = await authenticatedClient.curatePost(
                matchingPostRef.id, 
                'remove',
                {
                  reason: reason || "Author removed their own content"
                }
              );
              
              console.log(`⚠️ Removed post using URI fallback from ring ${ringSlug}:`, {
                threadSteadPostId: id,
                ringHubPostRefId: matchingPostRef.id,
                ringSlug
              });
              
              totalRemovedCount++;
              affectedRings.push(ringSlug);
            } else {
              console.warn(`❌ Could not find PostRef for post ${id} in ring ${ringSlug}`);
            }
          }
        } catch (ringError: any) {
          console.error(`Failed to remove post from ring ${threadRingAssociation.threadRing.slug}:`, {
            error: ringError.message,
            status: ringError.status
          });
        }
      }
      
      console.log(`Author ${me.primaryHandle || me.id} removed their post ${id} from RingHub:`, {
        totalRemoved: totalRemovedCount,
        affectedRings: affectedRings
      });
      
      ringHubSynced = totalRemovedCount > 0;
      affectedRingsResult = affectedRings;
      
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
    affectedRings: affectedRingsResult,
    threadRingsRemoved: post.threadRings.map(ptr => ptr.threadRing.name),
  });
}
