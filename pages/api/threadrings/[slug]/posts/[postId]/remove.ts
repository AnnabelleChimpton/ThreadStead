import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
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

    // Remove the association and update count
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
      message: `Post removed from ${threadRing.name}`
    });

  } catch (error) {
    console.error("Error removing post from ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}