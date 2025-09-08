import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { userId, threadRingId } = req.query;

  if (!userId && !threadRingId) {
    return res.status(400).json({ error: "Must specify either userId or threadRingId" });
  }

  try {
    const whereClause: any = { blockerId: user.id };
    if (userId) whereClause.blockedUserId = userId as string;
    if (threadRingId) whereClause.blockedThreadRingId = threadRingId as string;

    const block = await db.userBlock.findFirst({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        reason: true
      }
    });

    res.status(200).json({ 
      blocked: !!block,
      blockInfo: block || null
    });

  } catch (error) {
    console.error("Error checking block status:", error);
    res.status(500).json({ error: "Failed to check block status" });
  }
}