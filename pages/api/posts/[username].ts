import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.query.username || "");
  const handle = await db.handle.findFirst({
    where: { handle: username, host: "local" },
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

  const posts = await db.post.findMany({
    where: { authorId, visibility: { in: Array.from(allowed) as any } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({ posts });
}
