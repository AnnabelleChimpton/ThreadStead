import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const entryId = String(req.query.entryId || "");
  if (!entryId) {
    return res.status(400).json({ error: "entryId required" });
  }

  // Get the current user
  const currentUser = await getSessionUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "not logged in" });
  }

  try {
    // Find the guestbook entry
    const entry = await db.guestbookEntry.findUnique({
      where: { id: entryId },
      include: {
        owner: true  // Include the profile owner
      }
    });

    if (!entry) {
      return res.status(404).json({ error: "entry not found" });
    }

    // Check if the current user is the profile owner (can delete any entry on their profile)
    // or the author of the entry (can delete their own entry)
    const isProfileOwner = entry.profileOwner === currentUser.id;
    const isAuthor = entry.authorId === currentUser.id;

    if (!isProfileOwner && !isAuthor) {
      return res.status(403).json({ error: "not authorized to delete this entry" });
    }

    // Delete the entry (or mark as removed)
    await db.guestbookEntry.update({
      where: { id: entryId },
      data: { status: "removed" }
    });

    // Return updated entries for the profile
    const updatedEntries = await db.guestbookEntry.findMany({
      where: { profileOwner: entry.profileOwner, status: "visible" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ 
      success: true, 
      entries: updatedEntries,
      message: "Entry deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting guestbook entry:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}