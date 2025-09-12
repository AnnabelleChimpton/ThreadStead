import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getSessionUser } from "@/lib/auth/server";

/**
 * API endpoint to mark guestbook notifications as read
 * Only the profile owner can mark their own guestbook notifications as read
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const username = String(req.query.username || "");
  if (!username) {
    return res.status(400).json({ error: "username required" });
  }

  try {
    // Get current user session
    const currentUser = await getSessionUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Find the profile owner
    const userHandle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: { user: true },
    });

    if (!userHandle) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the current user is the profile owner
    if (currentUser.id !== userHandle.user.id) {
      return res.status(403).json({ error: "Can only mark your own guestbook notifications as read" });
    }

    // Mark all unread guestbook notifications as read
    const updateResult = await db.notification.updateMany({
      where: {
        recipientId: userHandle.user.id,
        type: "guestbook",
        status: "unread",
      },
      data: {
        status: "read",
        readAt: new Date(),
      },
    });

    return res.json({
      success: true,
      markedRead: updateResult.count,
    });

  } catch (error) {
    console.error("Error marking guestbook notifications as read:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}