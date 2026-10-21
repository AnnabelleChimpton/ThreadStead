import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { apiHandler } from "@/lib/api/handler";
import { readStoredObject } from "@/lib/storage/r2";
import { isSoundBank } from "@/lib/audio/is-sound-bank";
import { makeSongSoundBank } from "@/lib/audio/server/song-sound-bank";

export default apiHandler(
  // auth 'none': the session is looked up below only for non-public media
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
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
          soundBankUrl: true,
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

      // ?bank=1: the song's own sound bank, for the sampler (MIDI plan
      // Phase 3). The same access rules as the song. A song without one
      // (or whose stored bank is gone) gets it made now, once.
      if (req.query.bank === '1') {
        let bank = media.soundBankUrl ? await readStoredObject(media.soundBankUrl) : null;
        if (!bank || !isSoundBank(bank)) {
          try {
            bank = (await makeSongSoundBank(media)).bank;
          } catch (error) {
            console.error(`[media:${media.id}] Could not make the song's sound bank:`, error);
            return res.status(404).json({ error: "Sound bank not found" });
          }
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Length', bank.byteLength);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Disposition', 'attachment; filename="sound-bank.sf2"');
        return res.status(200).send(bank);
      }

      // Fetch the file from R2/S3
      const bytes = await readStoredObject(media.fullUrl);
      if (!bytes) {
        return res.status(404).json({ error: "File not found" });
      }

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
);