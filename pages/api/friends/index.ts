import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  try {
    // Get user's follows where they follow someone
    const userFollows = await db.follow.findMany({
      where: { followerId: viewer.id, status: "accepted" },
      select: { followeeId: true },
    });
    const userFollowees = new Set(userFollows.map(f => f.followeeId));

    if (userFollowees.size === 0) {
      return res.json({ friends: [] });
    }

    // Check which of those people also follow back (mutual follows = friends)
    const reciprocals = await db.follow.findMany({
      where: {
        followerId: { in: Array.from(userFollowees) },
        followeeId: viewer.id,
        status: "accepted",
      },
      select: { followerId: true },
    });
    const friendIds = reciprocals.map(r => r.followerId);

    if (friendIds.length === 0) {
      return res.json({ friends: [] });
    }

    // Get friend details
    const friends = await db.user.findMany({
      where: { id: { in: friendIds } },
      include: {
        profile: {
          select: { displayName: true, avatarUrl: true }
        },
        handles: {
          where: { host: SITE_NAME },
          take: 1,
          select: { handle: true }
        },
      },
    });

    const friendList = friends.map(friend => ({
      id: friend.id,
      handle: friend.handles[0]?.handle || friend.primaryHandle?.split("@")[0] || "user",
      displayName: friend.profile?.displayName || friend.handles[0]?.handle || "Unknown",
      avatarUrl: friend.profile?.avatarUrl || "/assets/default-avatar.gif",
    }));

    res.json({ friends: friendList });
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}