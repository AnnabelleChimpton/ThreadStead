import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const R2_PATH_PREFIX = "pixel-homes/decorations";
const MAX_FILE_SIZE = 500 * 1024; // 500KB max for decoration PNGs
const MAX_DIMENSION = 256; // Max width/height for decoration PNGs

// Configure S3 client for R2
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const requiredEnvVars = ['R2_PUBLIC_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_PUBLIC_URL!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: false,
    });
  }
  return s3Client;
}

function getCdnUrl(): string {
  return (process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || "threadstead-media";
}

interface UploadPngRequest {
  itemId: string;
  imageData: string; // Base64-encoded PNG data URL
  isHouseTemplate?: boolean;
  template?: string; // For house templates: cottage_v1, townhouse_v1, etc.
  palette?: string; // For house templates: thread_sage, crt_glow, etc.
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }

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
    const matches = imageData.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
    if (!matches) {
      return res.status(400).json({ error: "Invalid image data URL format" });
    }

    const [, imageFormat, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Validate file size
    if (imageBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB`
      });
    }

    // Get image metadata and validate dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      return res.status(400).json({ error: "Could not read image dimensions" });
    }

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      return res.status(400).json({
        error: `Image too large. Maximum dimensions are ${MAX_DIMENSION}x${MAX_DIMENSION} pixels`
      });
    }

    // Process image - convert to optimized PNG
    const processedBuffer = await sharp(imageBuffer)
      .png({
        compressionLevel: 9,
        palette: true
      })
      .toBuffer();

    // Determine R2 key
    let r2Key: string;
    if (isHouseTemplate) {
      r2Key = `${R2_PATH_PREFIX}/houses/${template}_${palette}.png`;
    } else {
      r2Key = `${R2_PATH_PREFIX}/${itemId}.png`;
    }

    // Upload to R2
    const client = getS3Client();
    await client.send(new PutObjectCommand({
      Bucket: getBucketName(),
      Key: r2Key,
      Body: processedBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    const pngUrl = `${getCdnUrl()}/${r2Key}`;

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

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};

export default withRateLimit('admin')(withCsrfProtection(handler));
