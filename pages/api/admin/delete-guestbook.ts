import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { requireAdmin } from "@/lib/auth/server";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { entryId } = req.body;
  if (!entryId) {
    return res.status(400).json({ error: "Entry ID is required" });
  }

  try {
    const entry = await db.guestbookEntry.findUnique({
      where: { id: entryId },
      include: {
        owner: {
          select: {
            primaryHandle: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ error: "Guestbook entry not found" });
    }

    await db.guestbookEntry.delete({
      where: { id: entryId },
    });

    res.json({ 
      success: true,
      deletedEntry: {
        id: entry.id,
        profileOwner: entry.owner.profile?.displayName || entry.owner.primaryHandle || "Unknown",
        message: entry.message.substring(0, 50) + (entry.message.length > 50 ? "..." : ""),
      },
    });
  } catch (error) {
    console.error("Error deleting guestbook entry:", error);
    res.status(500).json({ error: "Failed to delete guestbook entry" });
  }
}