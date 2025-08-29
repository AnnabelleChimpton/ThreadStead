import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { SITE_NAME } from "@/lib/site-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const username = String(req.query.username || "");
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  try {
    // Find the user by handle
    const handle = await db.handle.findFirst({
      where: { 
        handle: username, 
        host: SITE_NAME 
      },
      include: {
        user: true
      }
    });

    if (!handle) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get MIDI files for this user
    const midiFiles = await db.media.findMany({
      where: {
        userId: handle.user.id,
        mediaType: "midi",
        visibility: "public"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        title: true,
        caption: true,
        fullUrl: true,
        originalName: true,
        fileSize: true,
        createdAt: true,
        featured: true,
        featuredOrder: true,
      }
    });

    return res.status(200).json({
      files: midiFiles,
      count: midiFiles.length
    });

  } catch (error) {
    console.error("Error fetching MIDI files:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}