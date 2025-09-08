import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getUserBlockedIds, addBlockFiltersToWhere } from "@/lib/domain/users/blocks";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.query.username || "");
  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: true },
  });
  if (!handle) return res.status(404).json({ error: "not found" });

  const viewer = await getSessionUser(req); // may be null
  const authorId = handle.user.id;

  // default: public only
  let allowed = new Set(["public"]);

  if (viewer?.id === authorId) {
    // author sees everything
    allowed = new Set(["public", "followers", "friends", "private"]);
  } else if (viewer) {
    // check relationships
    const [viewerFollowsAuthor, authorFollowsViewer] = await Promise.all([
      db.follow.findUnique({
        where: { followerId_followeeId: { followerId: viewer.id, followeeId: authorId } },
      }),
      db.follow.findUnique({
        where: { followerId_followeeId: { followerId: authorId, followeeId: viewer.id } },
      }),
    ]);

    const isFollower = viewerFollowsAuthor?.status === "accepted";
    const isFriend = isFollower && authorFollowsViewer?.status === "accepted";

    if (isFollower) allowed.add("followers");
    if (isFriend) allowed.add("friends");
  }

  // Get blocked users/ThreadRings for the viewer (if logged in)
  let blockedUserIds: string[] = [];
  let blockedThreadRingIds: string[] = [];
  
  if (viewer) {
    const blockData = await getUserBlockedIds(viewer.id);
    blockedUserIds = blockData.blockedUserIds;
    blockedThreadRingIds = blockData.blockedThreadRingIds;
  }

  // Build the where clause with block filters
  let whereClause: any = { 
    authorId, 
    visibility: { in: Array.from(allowed) as any } 
  };

  // Apply block filters if viewer is logged in
  if (viewer) {
    whereClause = addBlockFiltersToWhere(whereClause, blockedUserIds, blockedThreadRingIds);
  }

  const posts = await db.post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: {
        select: {
          id: true,
          primaryHandle: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
      threadRings: {
        include: {
          threadRing: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  res.json({ posts });
}
