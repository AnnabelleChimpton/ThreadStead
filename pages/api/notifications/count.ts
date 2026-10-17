import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";



// Polled by NotificationIndicator/NotificationDropdown/NotificationBell; they
// treat 401 as "signed out", so keep auth: "user".
export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res, { user }) => {
    const unreadCount = await db.notification.count({
      where: {
        recipientId: user.id,
        status: "unread",
      },
    });

    return res.json({ count: unreadCount });
  }
);
