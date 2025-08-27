import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  if (req.method === "GET") {
    // Get user's blocklist
    try {
      const blocks = await db.userBlock.findMany({
        where: { blockerId: user.id },
        include: {
          blockedUser: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          blockedThreadRing: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      res.status(200).json({ blocks });

    } catch (error) {
      console.error("Error fetching blocks:", error);
      res.status(500).json({ error: "Failed to fetch blocks" });
    }
  }

  else if (req.method === "POST") {
    // Create a new block
    try {
      const { blockedUserId, blockedThreadRingId, reason } = req.body;

      if (!blockedUserId && !blockedThreadRingId) {
        return res.status(400).json({ error: "Must specify either blockedUserId or blockedThreadRingId" });
      }

      if (blockedUserId && blockedThreadRingId) {
        return res.status(400).json({ error: "Cannot block both user and threadring in same request" });
      }

      // Prevent self-blocking
      if (blockedUserId === user.id) {
        return res.status(400).json({ error: "Cannot block yourself" });
      }

      // Check if block already exists
      const existingBlock = await db.userBlock.findFirst({
        where: {
          blockerId: user.id,
          ...(blockedUserId ? { blockedUserId } : { blockedThreadRingId })
        }
      });

      if (existingBlock) {
        return res.status(409).json({ error: "Already blocked" });
      }

      // Verify the target exists
      if (blockedUserId) {
        const targetUser = await db.user.findUnique({ where: { id: blockedUserId } });
        if (!targetUser) {
          return res.status(404).json({ error: "User not found" });
        }
      }

      if (blockedThreadRingId) {
        const targetThreadRing = await db.threadRing.findUnique({ where: { id: blockedThreadRingId } });
        if (!targetThreadRing) {
          return res.status(404).json({ error: "ThreadRing not found" });
        }
      }

      // Create the block
      const block = await db.userBlock.create({
        data: {
          blockerId: user.id,
          blockedUserId: blockedUserId || null,
          blockedThreadRingId: blockedThreadRingId || null,
          reason: reason?.trim() || null
        },
        include: {
          blockedUser: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true
                }
              }
            }
          },
          blockedThreadRing: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      res.status(201).json({ 
        message: "Block created successfully",
        block 
      });

    } catch (error) {
      console.error("Error creating block:", error);
      res.status(500).json({ error: "Failed to create block" });
    }
  }

  else if (req.method === "DELETE") {
    // Remove a block
    try {
      const { blockedUserId, blockedThreadRingId } = req.body;

      if (!blockedUserId && !blockedThreadRingId) {
        return res.status(400).json({ error: "Must specify either blockedUserId or blockedThreadRingId" });
      }

      const whereClause: any = { blockerId: user.id };
      if (blockedUserId) whereClause.blockedUserId = blockedUserId;
      if (blockedThreadRingId) whereClause.blockedThreadRingId = blockedThreadRingId;

      const deletedBlock = await db.userBlock.deleteMany({
        where: whereClause
      });

      if (deletedBlock.count === 0) {
        return res.status(404).json({ error: "Block not found" });
      }

      res.status(200).json({ message: "Block removed successfully" });

    } catch (error) {
      console.error("Error removing block:", error);
      res.status(500).json({ error: "Failed to remove block" });
    }
  }

  else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}