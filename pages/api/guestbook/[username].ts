import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.query.username || "");
  if (!username) return res.status(400).json({ error: "username required" });

  const ownerHandle = await db.handle.findFirst({
    where: { handle: username, host: "local" },
    include: { user: true },
  });
  if (!ownerHandle) return res.status(404).json({ error: "not found" });

  if (req.method === "GET") {
    const entries = await db.guestbookEntry.findMany({
      where: { profileOwner: ownerHandle.user.id, status: "visible" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json({ entries });
  }

  if (req.method === "POST") {
    const { message } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message required" });
    }

    await db.guestbookEntry.create({
      data: {
        profileOwner: ownerHandle.user.id,
        authorId: null,
        message: message.trim(),
      },
    });

    const entries = await db.guestbookEntry.findMany({
      where: { profileOwner: ownerHandle.user.id, status: "visible" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.status(201).json({ entries });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
