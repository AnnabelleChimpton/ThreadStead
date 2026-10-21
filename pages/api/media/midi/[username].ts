import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";

/**
 * A resident's songs, for their own Music settings only (MIDI plan Phase 5).
 * It used to be public: anyone could list every song a resident had ever
 * uploaded, with raw storage links, past visibility and blocks.
 */
export default apiHandler(
  { methods: ['GET'], auth: 'user' },
  async (req, res, { user: me }) => {
    const username = String(req.query.username || "");
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    try {
      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        select: { userId: true },
      });
      if (!handle || handle.userId !== me.id) {
        return res.status(403).json({ error: "These are someone else's songs" });
      }

      const midiFiles = await db.media.findMany({
        where: { userId: me.id, mediaType: "midi" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          caption: true,
          originalName: true,
          fileSize: true,
          createdAt: true,
        },
      });

      return res.status(200).json({
        files: midiFiles,
        count: midiFiles.length,
      });
    } catch (error) {
      console.error("Error fetching MIDI files:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
