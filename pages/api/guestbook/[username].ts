import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAction } from "@/lib/capabilities";
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

  // inside handler, replace your POST branch with:
if (req.method === "POST") {
  const { message, cap } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message required" });
  }
  if (!cap || typeof cap !== "string") {
    return res.status(401).json({ error: "capability required" });
  }

  // resource for this profile's guestbook
  const resource = `user:${ownerHandle.user.id}/guestbook`;

  // validate capability
  const ok = await requireAction("write:guestbook", (resStr) => resStr === resource)(cap)
    .catch(() => null);
  if (!ok) return res.status(403).json({ error: "invalid capability" });

  await db.guestbookEntry.create({
    data: {
      profileOwner: ownerHandle.user.id,
      authorId: ok.sub, // the userId from the cap
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
