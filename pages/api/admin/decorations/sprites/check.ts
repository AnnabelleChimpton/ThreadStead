import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { decodeImageDataUrl } from "@/lib/media/image";
import { reviewSprite, SpriteError } from "@/lib/pixel-homes/decoration-art";

/**
 * POST /api/admin/decorations/sprites/check — "New from PNG", step 1.
 * Reads the filename and picture and returns the checks, plus the catalog
 * item it would update if the itemId already exists. Writes nothing.
 */
export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const { filename, imageData } = (req.body ?? {}) as { filename?: unknown; imageData?: unknown };
    if (typeof filename !== "string" || typeof imageData !== "string") {
      return res.status(400).json({ error: "Send a filename and the PNG." });
    }
    const decoded = decodeImageDataUrl(imageData);
    if (!decoded) return res.status(400).json({ error: "That isn't a PNG." });

    let review;
    try {
      review = await reviewSprite(filename, decoded.buffer);
    } catch (error) {
      if (error instanceof SpriteError) return res.status(400).json({ error: error.message });
      throw error;
    }

    const existing = await db.decorationItem.findUnique({
      where: { itemId: review.name.itemId },
      select: {
        id: true, itemId: true, name: true, type: true, category: true, releaseType: true,
        releaseStartAt: true, releaseEndAt: true, collection: true, isActive: true,
        pngUrl: true, width: true, height: true, frames: true, pngVersion: true,
        artVersions: { orderBy: { version: "desc" }, select: { version: true, url: true, width: true, height: true, frames: true, colours: true, createdAt: true } },
      },
    });

    const { result } = review;
    return res.status(200).json({
      name: review.name,
      checks: result.checks,
      frameWidth: result.frameWidth,
      height: result.height,
      frames: result.frames,
      trimBottom: result.trimBottom,
      gridWidth: result.gridWidth,
      gridHeight: result.gridHeight,
      colourCount: result.colourCount,
      offPalette: result.offPalette,
      blocked: result.blocked,
      needsOverride: result.needsOverride,
      existing,
    });
  }
);

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
