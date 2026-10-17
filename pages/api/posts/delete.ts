import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { requireAction } from "@/lib/domain/users/capabilities";
import { removePostFromRingHub } from "@/lib/domain/posts/ringhub-removal";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // Remove the hub PostRefs as the author (never blocks local deletion).
  const { synced: ringHubSynced, affectedRings: affectedRingsResult } =
    await removePostFromRingHub(post, reason || "Author removed their own content");

  // Delete the post from local database (cascade will handle all associations).
  // The cascade removes PostThreadRing rows but does NOT adjust ThreadRing.postCount,
  // so decrement each associated ring's count here, clamped at 0 so it can't go negative.
  const associatedRingIds = post.threadRings.map(ptr => ptr.threadRing.id);
  await db.$transaction([
    ...associatedRingIds.map(ringId =>
      db.threadRing.updateMany({
        where: { id: ringId, postCount: { gt: 0 } },
        data: { postCount: { decrement: 1 } }
      })
    ),
    db.post.delete({ where: { id } })
  ]);
  
  res.json({
    ok: true,
    ringHubSynced,
    affectedRings: affectedRingsResult,
    threadRingsRemoved: post.threadRings.map(ptr => ptr.threadRing.name),
  });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('posts')(withCsrfProtection(handler));
