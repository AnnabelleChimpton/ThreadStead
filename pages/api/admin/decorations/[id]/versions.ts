import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { SpriteError, pointAtSpriteVersion } from "@/lib/pixel-homes/decoration-art";

/**
 * GET  /api/admin/decorations/:id/versions — every PNG uploaded for an item.
 * POST /api/admin/decorations/:id/versions { version } — show that one.
 */
export default apiHandler(
  { methods: ["GET", "POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    const item = await db.decorationItem.findUnique({ where: { id }, select: { id: true, pngVersion: true } });
    if (!item) return res.status(404).json({ error: "That decoration doesn't exist." });

    if (req.method === "POST") {
      const version = Number((req.body ?? {}).version);
      if (!Number.isInteger(version) || version < 1) return res.status(400).json({ error: "Pick a version." });
      try {
        const updated = await pointAtSpriteVersion(id, version);
        return res.status(200).json({ item: updated });
      } catch (error) {
        if (error instanceof SpriteError) return res.status(404).json({ error: error.message });
        throw error;
      }
    }

    const versions = await db.decorationArtVersion.findMany({
      where: { decorationId: id },
      orderBy: { version: "desc" },
      select: { version: true, url: true, width: true, height: true, frames: true, colours: true, createdAt: true },
    });
    return res.status(200).json({ current: item.pngVersion, versions });
  }
);
