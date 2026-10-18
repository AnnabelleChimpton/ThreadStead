import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";

/**
 * API endpoint to check if a user has unread guestbook entries
 * Only the owner can ask: it's their notification state.
 * Returns: { hasUnreadGuestbook: boolean, unreadCount: number }
 */
export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res, { user: currentUser }) => {
    const username = String(req.query.username || "");
    if (!username) {
      return res.status(400).json({ error: "username required" });
    }

    try {
      // Find the user handle
      const userHandle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: true },
      });

      if (!userHandle) {
        return res.status(404).json({ error: "User not found" });
      }

      if (currentUser.id !== userHandle.user.id) {
        return res.status(403).json({ error: "Can only check your own guestbook" });
      }

      // Check for unread guestbook notifications
      const unreadGuestbookNotifications = await db.notification.count({
        where: {
          recipientId: userHandle.user.id,
          type: "guestbook",
          status: "unread",
        },
      });

      return res.json({
        hasUnreadGuestbook: unreadGuestbookNotifications > 0,
        unreadCount: unreadGuestbookNotifications,
      });

    } catch (error) {
      console.error("Error checking guestbook status:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
