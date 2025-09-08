import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not logged in" });

  const unreadCount = await db.notification.count({
    where: {
      recipientId: user.id,
      status: "unread",
    },
  });

  return res.json({ count: unreadCount });
}