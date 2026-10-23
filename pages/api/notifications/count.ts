import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { visibleNotificationsWhere } from "@/lib/domain/notifications";



// Polled by NotificationIndicator/NotificationDropdown/NotificationBell; they
// treat 401 as "signed out", so keep auth: "user".
export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res, { user }) => {
    const unreadCount = await db.notification.count({
      where: { ...(await visibleNotificationsWhere(user.id)), status: "unread" },
    });

    return res.json({ count: unreadCount });
  }
);
