import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true,
        memberCount: true,
        curatorId: true
      }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Check if user is a member
    const membership = await db.threadRingMember.findUnique({
      where: {
        threadRingId_userId: {
          threadRingId: threadRing.id,
          userId: viewer.id
        }
      }
    });

    if (!membership) {
      return res.status(400).json({ error: "You are not a member of this ThreadRing" });
    }

    // Prevent curator from leaving without transferring ownership
    if (membership.role === "curator") {
      // Check if there are other members who could become curator
      const otherMembers = await db.threadRingMember.count({
        where: {
          threadRingId: threadRing.id,
          userId: {
            not: viewer.id
          }
        }
      });

      if (otherMembers > 0) {
        return res.status(400).json({ 
          error: "As curator, you must transfer ownership before leaving the ThreadRing" 
        });
      }
      // If curator is the only member, they can leave (ThreadRing becomes orphaned)
    }

    // Remove membership (posts remain associated)
    await db.$transaction([
      // Delete the membership
      db.threadRingMember.delete({
        where: {
          threadRingId_userId: {
            threadRingId: threadRing.id,
            userId: viewer.id
          }
        }
      }),
      // Update ThreadRing member count
      db.threadRing.update({
        where: { id: threadRing.id },
        data: {
          memberCount: {
            decrement: 1
          }
        }
      })
    ]);

    // Note: PostThreadRing associations remain intact
    // This preserves the historical record of posts shared to the ring

    return res.json({
      success: true,
      message: `You have left ${threadRing.name}. Your posts will remain in the ThreadRing.`
    });

  } catch (error) {
    console.error("Error leaving ThreadRing:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}