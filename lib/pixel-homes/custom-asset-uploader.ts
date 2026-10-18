/**
 * Custom Pixel Art Asset Upload Utilities
 *
 * Handles uploading user's custom pixel art images to R2 storage
 * Limited to one custom asset per user, max 64x64 pixels
 */

import crypto from "crypto";
import { deleteObjects, keyFromPublicUrl, putObject } from "@/lib/storage/r2";
import { decodeImageDataUrl, preparePixelArtPng } from "@/lib/media/image";

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
    const decoded = decodeImageDataUrl(imageDataUrl);
    if (!decoded) {
      throw new Error('Invalid image data URL format');
    }
    const imageBuffer = decoded.buffer;

    // Enforce size and 64x64 dimensions, then optimize as a palette PNG at
    // the original size (keeps pixel art crisp)
    const { buffer: processedBuffer } = await preparePixelArtPng(imageBuffer, {
      maxBytes: MAX_FILE_SIZE,
      maxDimension: MAX_DIMENSION,
    });

    // Generate unique filename
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const filename = `pixel-homes/custom/${userId}-${timestamp}-${hash}.png`;

    // Upload to R2
    const customAssetUrl = await putObject({
      key: filename,
      body: processedBuffer,
      contentType: 'image/png',
    });

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
  const key = keyFromPublicUrl(assetUrl);
  if (!key || !key.startsWith('pixel-homes/custom/')) {
    console.error(`Not deleting custom pixel art ${assetUrl}: not a custom asset URL`);
    return;
  }
  // Logs failures; deletion failures shouldn't block the user
  await deleteObjects([key], { context: 'pixel-homes:custom-asset' });
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
