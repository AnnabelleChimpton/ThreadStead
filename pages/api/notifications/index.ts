import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { parseLimit } from "@/lib/server/http/pagination";

const EXCERPT_LENGTH = 120;

/** First line-ish of a guestbook note, plain text, for the notification row. */
function excerpt(message: string): string {
  const text = message.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
}



export default apiHandler(
  {
    methods: ["GET", "PATCH", "POST"],
    auth: "user",
  },
  async (req, res, { user }) => {
    if (req.method === "GET") {
      const { status } = req.query;

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
        take: parseLimit(req.query.limit, { fallback: 20, max: 100 }),
      });

      // "X signed your guestbook" shows the note itself. Read it live so a
      // deleted or hidden entry never lingers in the bell.
      const entryIds = notifications
        .map((n) => (n.type === "guestbook" ? (n.data as { guestbookEntryId?: unknown } | null)?.guestbookEntryId : null))
        .filter((id): id is string => typeof id === "string");
      const entries = entryIds.length
        ? await db.guestbookEntry.findMany({
            where: { id: { in: entryIds }, profileOwner: user.id, status: "visible" },
            select: { id: true, message: true },
          })
        : [];
      const excerpts = new Map(entries.map((e) => [e.id, excerpt(e.message)]));

      const transformedNotifications = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        status: n.status,
        data:
          n.type === "guestbook" && n.data && typeof n.data === "object" && !Array.isArray(n.data)
            ? {
                ...n.data,
                excerpt: excerpts.get(String((n.data as { guestbookEntryId?: unknown }).guestbookEntryId)) ?? null,
                // The signed guestbook is the recipient's, so the link can
                // open it (lib/domain/notifications/links.ts)
                guestbookOwnerHandle: user.primaryHandle ?? null,
              }
            : n.data,
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
