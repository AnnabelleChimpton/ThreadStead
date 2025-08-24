/**
 * Badge Image Upload Utilities
 * 
 * Handles uploading badge images to R2/S3 storage for Ring Hub integration
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

interface BadgeUploadResult {
  badgeImageUrl?: string;
  badgeImageHighResUrl?: string;
}

/**
 * Upload badge image from data URL to R2 storage
 * Generates both standard (88x31) and high-res (352x124) versions
 */
export async function uploadBadgeImage(
  imageDataUrl: string,
  ringSlug: string
): Promise<BadgeUploadResult> {
  if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image data URL provided');
  }

  try {
    // Extract image data from data URL
    const matches = imageDataUrl.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
    if (!matches) {
      throw new Error('Invalid image data URL format');
    }

    const [, imageType, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename with hash to avoid collisions
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const baseFilename = `badges/${ringSlug}-${timestamp}-${hash}`;

    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'threadstead-media';
    const publicUrl = (process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL)?.replace(/\/$/, '') || '';

    // Standard badge (88x31) - optimize the original
    const standardBuffer = await sharp(imageBuffer)
      .resize(88, 31, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 90 })
      .toBuffer();

    // High-res badge (352x124) - 4x scale
    const highResBuffer = await sharp(imageBuffer)
      .resize(352, 124, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 95 })
      .toBuffer();

    // Upload standard badge
    const standardKey = `${baseFilename}.png`;
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: standardKey,
      Body: standardBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    }));

    // Upload high-res badge
    const highResKey = `${baseFilename}-hd.png`;
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: highResKey,
      Body: highResBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    }));

    // Construct public URLs
    const badgeImageUrl = `${publicUrl}/${standardKey}`;
    const badgeImageHighResUrl = `${publicUrl}/${highResKey}`;

    console.log(`Badge images uploaded for ${ringSlug}:`, {
      standard: badgeImageUrl,
      highRes: badgeImageHighResUrl
    });

    return {
      badgeImageUrl,
      badgeImageHighResUrl
    };

  } catch (error) {
    console.error('Error uploading badge image:', error);
    throw new Error(`Failed to upload badge image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that a URL is accessible and points to an image
 */
export async function validateBadgeImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type')?.startsWith('image/') || false);
  } catch (error) {
    console.warn('Badge image URL validation failed:', error);
    return false;
  }
}