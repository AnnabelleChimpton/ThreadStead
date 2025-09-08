import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const mediaId = String(req.query.id || "");
  if (!mediaId) {
    return res.status(400).json({ error: "Media ID required" });
  }

  try {
    // Get the media record
    const media = await db.media.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        fullUrl: true,
        mimeType: true,
        originalName: true,
        mediaType: true,
        userId: true,
        visibility: true,
      }
    });

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // Check if media is public or if user is the owner
    if (media.visibility !== 'public') {
      const user = await getSessionUser(req);
      if (!user || user.id !== media.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Only serve MIDI files through this proxy
    if (media.mediaType !== 'midi') {
      return res.status(400).json({ error: "This endpoint only serves MIDI files" });
    }

    // Fetch the file from R2/S3
    const response = await fetch(media.fullUrl);
    if (!response.ok) {
      console.error('Failed to fetch from R2:', response.status, response.statusText);
      return res.status(404).json({ error: "File not found" });
    }

    const buffer = await response.arrayBuffer();
    
    // Set appropriate headers
    res.setHeader('Content-Type', media.mimeType || 'audio/midi');
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (media.originalName) {
      res.setHeader('Content-Disposition', `inline; filename="${media.originalName}"`);
    }

    // Send the file
    res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error("Error serving MIDI file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}