import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    if (req.method === "POST") {
      // Pin the post
      const updated = await db.postThreadRing.update({
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
        isPinned: true
      });

    } else {
      // Unpin the post (DELETE method)
      const updated = await db.postThreadRing.update({
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
        isPinned: false
      });
    }

  } catch (error) {
    console.error("Error pinning/unpinning post:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}