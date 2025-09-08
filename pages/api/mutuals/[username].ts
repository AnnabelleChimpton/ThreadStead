import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const viewer = await getSessionUser(req);
  const username = String(req.query.username || "");

  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: true },
  });
  if (!handle) return res.status(404).json({ error: "not found" });

  if (!viewer) return res.json({ anon: true, count: 0, sample: [] });

  const ownerId = handle.user.id;
  const viewerId = viewer.id;

  // 🔹 If you're looking at your own page, don't show mutuals
  if (ownerId === viewerId) {
    return res.json({ owner: true, count: 0, sample: [] });
  }

  // 1) Friends of viewer = users with mutual accepted follows
  const viewerFollows = await db.follow.findMany({
    where: { followerId: viewerId, status: "accepted" },
    select: { followeeId: true },
  });
  const viewerFollowees = new Set(viewerFollows.map(f => f.followeeId));
  const viewerFriends: string[] = [];

  // check reciprocity for each followee (author follows viewer back)
  const reciprocals = await db.follow.findMany({
    where: {
      followerId: { in: Array.from(viewerFollowees) },
      followeeId: viewerId,
      status: "accepted",
    },
    select: { followerId: true },
  });
  for (const r of reciprocals) viewerFriends.push(r.followerId);

  // 2) Friends of owner
  const ownerFollows = await db.follow.findMany({
    where: { followerId: ownerId, status: "accepted" },
    select: { followeeId: true },
  });
  const ownerFollowees = new Set(ownerFollows.map(f => f.followeeId));
  const ownerFriends: string[] = [];
  const ownerReciprocals = await db.follow.findMany({
    where: {
      followerId: { in: Array.from(ownerFollowees) },
      followeeId: ownerId,
      status: "accepted",
    },
    select: { followerId: true },
  });
  for (const r of ownerReciprocals) ownerFriends.push(r.followerId);

  // 3) Intersect
  const mutualIds = new Set(ownerFriends.filter(id => viewerFriends.includes(id)));

  if (mutualIds.size === 0) return res.json({ count: 0, sample: [] });

  // 4) Fetch up to 12 sample handles/avatars to display
  const sampleUsers = await db.user.findMany({
    where: { id: { in: Array.from(mutualIds) } },
    take: 12,
    include: {
      profile: true,
      handles: {
        where: { host: SITE_NAME },
        take: 1,
      },
    },
  });

  const sample = sampleUsers.map(u => ({
    userId: u.id,
    handle: u.handles[0]?.handle || (u.primaryHandle?.split("@")[0] ?? "user"),
    avatarUrl: u.profile?.avatarUrl ?? "/assets/default-avatar.gif",
  }));

  res.json({ count: mutualIds.size, sample });
}
