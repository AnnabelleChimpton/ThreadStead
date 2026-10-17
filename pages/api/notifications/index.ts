import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";



export default apiHandler(
  {
    methods: ["GET", "PATCH", "POST"],
    auth: "user",
    // no CSRF today: NotificationDropdown sends PATCH with plain fetch
    csrf: false,
  },
  async (req, res, { user }) => {
    if (req.method === "GET") {
      const { limit = "20", status } = req.query;

      const whereClause: any = {
        recipientId: user.id,
      };

      if (status && status !== "all") {
        whereClause.status = status;
      }

      const notifications = await db.notification.findMany({
        where: whereClause,
        include: {
          actor: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100),
      });

      const transformedNotifications = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        status: n.status,
        data: n.data,
        createdAt: n.createdAt,
        readAt: n.readAt,
        actor: {
          id: n.actor.id,
          handle: n.actor.primaryHandle,
          displayName: n.actor.profile?.displayName,
          avatarUrl: n.actor.profile?.avatarUrl,
        },
      }));

      return res.json({ notifications: transformedNotifications });
    }

    if (req.method === "PATCH") {
      const { notificationIds, status } = req.body;

      if (!Array.isArray(notificationIds) || !status) {
        return res.status(400).json({ error: "notificationIds and status required" });
      }

      const updateData: any = { status };
      if (status === "read") {
        updateData.readAt = new Date();
      }

      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          recipientId: user.id, // ensure user can only update their own notifications
        },
        data: updateData,
      });

      return res.json({ success: true });
    }

    // POST: Mark all notifications as read
    await db.notification.updateMany({
      where: {
        recipientId: user.id,
        status: "unread",
      },
      data: {
        status: "read",
        readAt: new Date(),
      },
    });

    return res.json({ success: true });
  }
);
