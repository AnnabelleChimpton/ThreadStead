// pages/api/follow/[username].ts
import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { createFollowNotification, createFriendNotification, checkForMutualFollow } from "@/lib/domain/notifications";
import { SITE_NAME } from "@/lib/config/site/constants";

export default apiHandler(
  { methods: ["POST", "DELETE"], auth: "user" },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
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
        await createFollowNotification(authorId, viewer.id);

        // Check if this creates a mutual friendship
        const isMutual = await checkForMutualFollow(viewer.id, authorId);
        if (isMutual) {
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

    // DELETE
    await db.follow.deleteMany({
      where: { followerId: viewer.id, followeeId: authorId },
    });
    return res.json({ ok: true });
  }
);
