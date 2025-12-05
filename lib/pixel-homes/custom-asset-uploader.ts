/**
 * Custom Pixel Art Asset Upload Utilities
 *
 * Handles uploading user's custom pixel art images to R2 storage
 * Limited to one custom asset per user, max 64x64 pixels
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";

// Configure S3 client for R2 (with lazy initialization)
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

interface CustomAssetUploadResult {
  customAssetUrl: string;
}

const MAX_DIMENSION = 64;
const MAX_FILE_SIZE = 100 * 1024; // 100KB max

/**
 * Upload custom pixel art image from data URL to R2 storage
 * Enforces 64x64 max dimensions and preserves pixel art crispness
 */
export async function uploadCustomPixelArt(
  imageDataUrl: string,
  userId: string
): Promise<CustomAssetUploadResult> {
  if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image data URL provided');
  }

  try {
    // Extract image data from data URL
    const matches = imageDataUrl.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
    if (!matches) {
      throw new Error('Invalid image data URL format');
    }

    const [, , base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Check file size
    if (imageBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`Image too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB`);
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Could not read image dimensions');
    }

    // Validate dimensions (must be within 64x64)
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      throw new Error(`Image too large. Maximum dimensions are ${MAX_DIMENSION}x${MAX_DIMENSION} pixels`);
    }

    // Process image - preserve pixel art with nearest neighbor resampling
    // Keep original size but optimize for web
    const processedBuffer = await sharp(imageBuffer)
      .png({
        compressionLevel: 9,
        palette: true // Use palette for smaller file size
      })
      .toBuffer();

    // Generate unique filename
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const filename = `pixel-homes/custom/${userId}-${timestamp}-${hash}.png`;

    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'threadstead-media';
    const publicUrl = (process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL)?.replace(/\/$/, '') || '';

    // Upload to R2
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: processedBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    }));

    const customAssetUrl = `${publicUrl}/${filename}`;

    return { customAssetUrl };

  } catch (error) {
    console.error('Error uploading custom pixel art:', error);
    throw new Error(`Failed to upload custom asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a custom pixel art asset from R2
 */
export async function deleteCustomPixelArt(assetUrl: string): Promise<void> {
  try {
    const publicUrl = (process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL)?.replace(/\/$/, '') || '';
    const key = assetUrl.replace(`${publicUrl}/`, '');

    if (!key.startsWith('pixel-homes/custom/')) {
      throw new Error('Invalid asset URL');
    }

    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'threadstead-media';

    await client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
  } catch (error) {
    console.error('Error deleting custom pixel art:', error);
    // Don't throw - deletion failures shouldn't block the user
  }
}

/**
 * Validate image data URL before upload
 */
export function validateCustomAssetDataUrl(dataUrl: string): { valid: boolean; error?: string } {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format' };
  }

  const matches = dataUrl.match(/^data:image\/(png|gif|webp);base64,(.*)$/);
  if (!matches) {
    return { valid: false, error: 'Only PNG, GIF, and WebP images are supported' };
  }

  const [, , base64Data] = matches;
  const estimatedSize = (base64Data.length * 3) / 4;

  if (estimatedSize > MAX_FILE_SIZE) {
    return { valid: false, error: `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB` };
  }

  return { valid: true };
}
