import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
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
);