import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAction } from "@/lib/capabilities";
import { createGuestbookNotification } from "@/lib/notifications";
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
    
    // Get unique author IDs (excluding null values)
    const authorIds = [...new Set(entries.map(e => e.authorId).filter(Boolean))];
    
    // Fetch handles for these authors
    const authorHandles = await db.handle.findMany({
      where: { 
        userId: { in: authorIds as string[] },
        host: "local"
      },
      select: {
        userId: true,
        handle: true
      }
    });
    
    // Create a map of userId -> handle
    const userHandleMap = new Map(authorHandles.map(h => [h.userId, h.handle]));
    
    // Transform entries to include username
    const transformedEntries = entries.map(entry => ({
      ...entry,
      authorUsername: entry.authorId ? userHandleMap.get(entry.authorId) || null : null
    }));
    
    return res.json({ entries: transformedEntries });
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

  const entry = await db.guestbookEntry.create({
    data: {
      profileOwner: ownerHandle.user.id,
      authorId: ok.sub, // the userId from the cap
      message: message.trim(),
    },
  });

  // Create guestbook notification
  await createGuestbookNotification(ownerHandle.user.id, ok.sub, entry.id);

  const entries = await db.guestbookEntry.findMany({
    where: { profileOwner: ownerHandle.user.id, status: "visible" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  
  // Get unique author IDs (excluding null values)
  const authorIds = [...new Set(entries.map(e => e.authorId).filter(Boolean))];
  
  // Fetch handles for these authors
  const authorHandles = await db.handle.findMany({
    where: { 
      userId: { in: authorIds as string[] },
      host: "local"
    },
    select: {
      userId: true,
      handle: true
    }
  });
  
  // Create a map of userId -> handle
  const userHandleMap = new Map(authorHandles.map(h => [h.userId, h.handle]));
  
  // Transform entries to include username
  const transformedEntries = entries.map(entry => ({
    ...entry,
    authorUsername: entry.authorId ? userHandleMap.get(entry.authorId) || null : null
  }));
  
  return res.status(201).json({ entries: transformedEntries });
}

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
