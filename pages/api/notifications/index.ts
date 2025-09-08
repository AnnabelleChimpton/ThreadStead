import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not logged in" });

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
      take: parseInt(String(limit), 10),
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

  if (req.method === "POST") {
    // Mark all notifications as read
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

  res.setHeader("Allow", ["GET", "PATCH", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}