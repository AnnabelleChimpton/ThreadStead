/**
 * Shared sharp pipelines for uploaded images. Server-only.
 *
 * Every size, fit and quality here is what the upload routes produced before
 * they were consolidated — change one and newly uploaded files look different
 * from everything already stored.
 */
import sharp from 'sharp';

export interface ImageSizes {
  thumbnail: Buffer;
  medium: Buffer;
  full: Buffer;
}

/** Thrown for bad user input (wrong size, unreadable image) — a 400, not a 500. */
export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

const TRANSPARENT_WHITE = { r: 255, g: 255, b: 255, alpha: 0 };
const TRANSPARENT_BLACK = { r: 0, g: 0, b: 0, alpha: 0 };

/** Avatar: square crops (the client crops to square first), JPEG. */
export const AVATAR_SIZES = { thumbnail: 64, medium: 200, full: 800 } as const;

export async function renderAvatarSizes(input: Buffer): Promise<ImageSizes> {
  const [thumbnail, medium, full] = await Promise.all([
    sharp(input)
      .resize(AVATAR_SIZES.thumbnail, AVATAR_SIZES.thumbnail, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toBuffer(),
    sharp(input)
      .resize(AVATAR_SIZES.medium, AVATAR_SIZES.medium, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer(),
    sharp(input)
      .resize(AVATAR_SIZES.full, AVATAR_SIZES.full, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer(),
  ]);
  return { thumbnail, medium, full };
}

/** Gallery/post media: square thumbnail, aspect-preserving medium and full, JPEG. */
export async function renderMediaSizes(input: Buffer): Promise<ImageSizes> {
  const [thumbnail, medium, full] = await Promise.all([
    sharp(input).resize(150, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
    sharp(input)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
    sharp(input)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer(),
  ]);
  return { thumbnail, medium, full };
}

/** 88×31 web badge and its 4× (352×124) version, letterboxed on transparent PNG. */
export const BADGE_SIZE = { width: 88, height: 31 } as const;
export const BADGE_HD_SIZE = { width: 352, height: 124 } as const;

/**
 * Fit an image inside width×height on a transparent background, as PNG.
 * Note sharp's PNG `quality` quantises to a palette, so it changes the bytes.
 */
export function containPng(
  input: Buffer,
  width: number,
  height: number,
  { quality, background = TRANSPARENT_WHITE }: { quality: number; background?: sharp.Color }
): Promise<Buffer> {
  return sharp(input).resize(width, height, { fit: 'contain', background }).png({ quality }).toBuffer();
}

/** Custom emoji: 64×64 transparent PNG. */
export function renderEmoji(input: Buffer): Promise<Buffer> {
  return containPng(input, 64, 64, { quality: 90, background: TRANSPARENT_BLACK });
}

export async function imageDimensions(input: Buffer): Promise<{ width?: number; height?: number }> {
  const { width, height } = await sharp(input).metadata();
  return { width, height };
}

/** `data:image/<fmt>;base64,<data>` → bytes, or null if it isn't one. */
export function decodeImageDataUrl(dataUrl: string): { format: string; buffer: Buffer } | null {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
  if (!matches) return null;
  const [, format, base64Data] = matches;
  return { format, buffer: Buffer.from(base64Data, 'base64') };
}

/**
 * Pixel art (pixel-home decorations, custom assets): enforce byte and
 * dimension limits, then re-encode as a palette PNG at the original size.
 * Throws ImageValidationError with a user-facing message.
 */
export async function preparePixelArtPng(
  input: Buffer,
  { maxBytes, maxDimension }: { maxBytes: number; maxDimension: number }
): Promise<{ buffer: Buffer; width: number; height: number }> {
  if (input.length > maxBytes) {
    throw new ImageValidationError(`Image too large. Maximum size is ${maxBytes / 1024}KB`);
  }

  const { width, height } = await imageDimensions(input);
  if (!width || !height) {
    throw new ImageValidationError('Could not read image dimensions');
  }
  if (width > maxDimension || height > maxDimension) {
    throw new ImageValidationError(
      `Image too large. Maximum dimensions are ${maxDimension}x${maxDimension} pixels`
    );
  }

  const buffer = await sharp(input).png({ compressionLevel: 9, palette: true }).toBuffer();
  return { buffer, width, height };
}
