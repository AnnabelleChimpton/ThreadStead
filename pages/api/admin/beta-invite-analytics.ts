import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if user is authenticated and is admin
    const user = await getSessionUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get total shares count
    const totalShares = await db.betaInviteShare.count();

    // Get shares by method
    const sharesByMethodData = await db.betaInviteShare.groupBy({
      by: ["shareMethod"],
      _count: {
        shareMethod: true,
      },
    });

    const sharesByMethod = {
      copy_link: 0,
      copy_code: 0,
      social_share: 0,
    };

    sharesByMethodData.forEach((item) => {
      if (item.shareMethod in sharesByMethod) {
        sharesByMethod[item.shareMethod as keyof typeof sharesByMethod] = item._count.shareMethod;
      }
    });

    // Get top sharers
    const topSharersData = await db.betaInviteShare.groupBy({
      by: ["sharedBy"],
      _count: {
        sharedBy: true,
      },
      orderBy: {
        _count: {
          sharedBy: "desc",
        },
      },
      take: 5,
    });

    const topSharers = await Promise.all(
      topSharersData.map(async (item) => {
        const user = await db.user.findUnique({
          where: { id: item.sharedBy },
          include: {
            profile: true,
            handles: true,
          },
        });

        return {
          userId: item.sharedBy,
          displayName: user?.profile?.displayName || "Unknown User",
          handle: user?.handles[0]?.handle || "unknown",
          shareCount: item._count.sharedBy,
        };
      })
    );

    // Get recent shares (last 10)
    const recentShares = await db.betaInviteShare.findMany({
      take: 10,
      orderBy: {
        sharedAt: "desc",
      },
      include: {
        sharer: {
          include: {
            profile: true,
            handles: true,
          },
        },
        code: {
          select: {
            code: true,
          },
        },
      },
    });

    const formattedRecentShares = recentShares.map((share) => ({
      id: share.id,
      shareMethod: share.shareMethod,
      sharedAt: share.sharedAt.toISOString(),
      platform: share.platform,
      sharer: {
        displayName: share.sharer.profile?.displayName || "Unknown User",
        handle: share.sharer.handles[0]?.handle || "unknown",
      },
      code: {
        code: share.code.code,
      },
    }));

    // Get shares over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sharesOverTimeData = await db.betaInviteShare.groupBy({
      by: ["sharedAt"],
      where: {
        sharedAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Create daily buckets for the last 7 days
    const sharesOverTime = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayShares = sharesOverTimeData.filter((share) => {
        const shareDate = new Date(share.sharedAt);
        return shareDate >= date && shareDate < nextDate;
      });

      sharesOverTime.push({
        date: date.toISOString().split('T')[0],
        count: dayShares.reduce((sum, share) => sum + share._count.id, 0),
      });
    }

    const analytics = {
      totalShares,
      sharesByMethod,
      topSharers,
      recentShares: formattedRecentShares,
      sharesOverTime,
    };

    res.status(200).json({ analytics });
  } catch (error) {
    console.error("Failed to fetch beta invite analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}