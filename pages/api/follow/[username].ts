// pages/api/follow/[username].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { createFollowNotification, createFriendNotification, checkForMutualFollow } from "@/lib/notifications";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const username = String(req.query.username || "");
  const handle = await db.handle.findFirst({
    where: { handle: username, host: "local" },
    include: { user: true },
  });
  if (!handle) return res.status(404).json({ error: "not found" });

  const authorId = handle.user.id;
  if (authorId === viewer.id) return res.status(400).json({ error: "cannot follow yourself" });

  if (req.method === "POST") {
    // follow (accepted immediately)
    await db.follow.upsert({
      where: { followerId_followeeId: { followerId: viewer.id, followeeId: authorId } },
      update: { status: "accepted" },
      create: { followerId: viewer.id, followeeId: authorId, status: "accepted" },
    });

    // Create follow notification
    try {
      console.log(`Creating follow notification: ${viewer.id} followed ${authorId}`);
      await createFollowNotification(authorId, viewer.id);

      // Check if this creates a mutual friendship
      const isMutual = await checkForMutualFollow(viewer.id, authorId);
      if (isMutual) {
        console.log(`Creating mutual friend notifications between ${viewer.id} and ${authorId}`);
        // Create friend notifications for both users
        await createFriendNotification(authorId, viewer.id);
        await createFriendNotification(viewer.id, authorId);
      }
    } catch (notificationError) {
      console.error("Failed to create follow notification:", notificationError);
      // Don't fail the follow action if notification fails
    }

    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.follow.deleteMany({
      where: { followerId: viewer.id, followeeId: authorId },
    });
    return res.json({ ok: true });
  }

  res.setHeader("Allow", ["POST", "DELETE"]);
  res.status(405).json({ error: "Method Not Allowed" });
}
