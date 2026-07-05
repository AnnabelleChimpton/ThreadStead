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

    const bytes = Buffer.from(await response.arrayBuffer());

    // Verify the bytes are actually a MIDI file (magic number "MThd").
    // The upload path trusts the client-supplied MIME/extension, so a file
    // named x.mid could hold HTML; serving that inline from our origin with
    // its stored content-type would be stored XSS. Refuse anything that
    // isn't a real MIDI.
    if (bytes.length < 4 || bytes.toString('ascii', 0, 4) !== 'MThd') {
      return res.status(415).json({ error: "File is not a valid MIDI file" });
    }

    // Content-Type is FORCED to audio/midi (never the stored mimeType) and
    // the download name is sanitized so a crafted filename can't inject
    // headers or a script content-type.
    const safeName = (media.originalName || 'song.mid')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);
    res.setHeader('Content-Type', 'audio/midi');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', bytes.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

    // Send the file
    res.status(200).send(bytes);

  } catch (error) {
    console.error("Error serving MIDI file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}