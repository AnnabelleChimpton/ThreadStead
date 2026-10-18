import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { putObject } from "@/lib/storage/r2";
import { decodeImageDataUrl, ImageValidationError, preparePixelArtPng } from "@/lib/media/image";

const R2_PATH_PREFIX = "pixel-homes/decorations";
const MAX_FILE_SIZE = 500 * 1024; // 500KB max for decoration PNGs
const MAX_DIMENSION = 256; // Max width/height for decoration PNGs

interface UploadPngRequest {
  itemId: string;
  imageData: string; // Base64-encoded PNG data URL
  isHouseTemplate?: boolean;
  template?: string; // For house templates: cottage_v1, townhouse_v1, etc.
  palette?: string; // For house templates: thread_sage, crt_glow, etc.
}

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    try {
      const { itemId, imageData, isHouseTemplate, template, palette }: UploadPngRequest = req.body;

      // Validate input
      if (!imageData || !imageData.startsWith('data:image/')) {
        return res.status(400).json({ error: "Invalid image data URL" });
      }

      if (isHouseTemplate) {
        if (!template || !palette) {
          return res.status(400).json({
            error: "template and palette are required for house template uploads"
          });
        }
      } else {
        if (!itemId) {
          return res.status(400).json({ error: "itemId is required" });
        }
      }

      // Extract base64 data
      const decoded = decodeImageDataUrl(imageData);
      if (!decoded) {
        return res.status(400).json({ error: "Invalid image data URL format" });
      }

      // Validate size and dimensions, then convert to optimized PNG
      let prepared;
      try {
        prepared = await preparePixelArtPng(decoded.buffer, {
          maxBytes: MAX_FILE_SIZE,
          maxDimension: MAX_DIMENSION,
        });
      } catch (error) {
        if (error instanceof ImageValidationError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
      const { buffer: processedBuffer, width, height } = prepared;

      // Determine R2 key
      let r2Key: string;
      if (isHouseTemplate) {
        r2Key = `${R2_PATH_PREFIX}/houses/${template}_${palette}.png`;
      } else {
        r2Key = `${R2_PATH_PREFIX}/${itemId}.png`;
      }

      // Upload to R2
      const pngUrl = `${await putObject({ key: r2Key, body: processedBuffer, contentType: 'image/png' })}?v=${Date.now()}`;

      // Update database if this is a decoration item (not house template)
      if (!isHouseTemplate && itemId) {
        await db.decorationItem.updateMany({
          where: { itemId },
          data: { pngUrl }
        });
      }

      return res.status(200).json({
        success: true,
        pngUrl,
        dimensions: { width, height },
        size: processedBuffer.length
      });

    } catch (error) {
      console.error('Upload PNG error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error"
      });
    }
  }
);

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};
