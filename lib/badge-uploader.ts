/**
 * Badge Image Upload Utilities
 * 
 * Handles uploading badge images to R2/S3 storage for Ring Hub integration
 */

import crypto from "crypto";
import { putObject } from "@/lib/storage/r2";
import { BADGE_HD_SIZE, BADGE_SIZE, containPng, decodeImageDataUrl } from "@/lib/media/image";

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
    const decoded = decodeImageDataUrl(imageDataUrl);
    if (!decoded) {
      throw new Error('Invalid image data URL format');
    }
    const imageBuffer = decoded.buffer;

    // Generate unique filename with hash to avoid collisions
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const baseFilename = `badges/${ringSlug}-${timestamp}-${hash}`;

    // Standard badge (88x31) - optimize the original
    const standardBuffer = await containPng(imageBuffer, BADGE_SIZE.width, BADGE_SIZE.height, { quality: 90 });

    // High-res badge (352x124) - 4x scale
    const highResBuffer = await containPng(imageBuffer, BADGE_HD_SIZE.width, BADGE_HD_SIZE.height, { quality: 95 });

    // Upload standard and high-res badges
    const badgeImageUrl = await putObject({
      key: `${baseFilename}.png`,
      body: standardBuffer,
      contentType: 'image/png',
    });
    const badgeImageHighResUrl = await putObject({
      key: `${baseFilename}-hd.png`,
      body: highResBuffer,
      contentType: 'image/png',
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