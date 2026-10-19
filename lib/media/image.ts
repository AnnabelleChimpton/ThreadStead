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

/** Profile banner: one wide crop across the top of the profile, JPEG. */
export const BANNER_SIZE = { width: 1500, height: 500 } as const;

export function renderBanner(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(BANNER_SIZE.width, BANNER_SIZE.height, { fit: 'cover', position: 'centre', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
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

/**
 * PNG and WebP media keep their format: transparency, and pixel art's exact
 * pixels, survive (the JPEG pipeline above flattened and blurred both). Still
 * re-encoded, so hidden metadata like location is dropped. PNG is lossless;
 * WebP keeps full alpha. The full size is only shrunk past MEDIA_KEEP_MAX.
 */
export const MEDIA_KEEP_MAX = 4096;

export async function renderMediaSizesKeepingFormat(input: Buffer, format: 'png' | 'webp'): Promise<ImageSizes> {
  const encode = (img: sharp.Sharp) =>
    format === 'png' ? img.png({ compressionLevel: 9 }) : img.webp({ quality: 90, alphaQuality: 100 });
  const [thumbnail, medium, full] = await Promise.all([
    encode(sharp(input).rotate().resize(150, 150, { fit: 'cover' })).toBuffer(),
    encode(sharp(input).rotate().resize(600, 600, { fit: 'inside', withoutEnlargement: true })).toBuffer(),
    encode(sharp(input).rotate().resize(MEDIA_KEEP_MAX, MEDIA_KEEP_MAX, { fit: 'inside', withoutEnlargement: true })).toBuffer(),
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

/** What's in a piece of pixel art, pixel by pixel. */
export interface PixelArtInspection {
  width: number;
  height: number;
  /** `#rrggbb` → how many fully opaque pixels use it. */
  colours: Map<string, number>;
  /** Pixels that are neither fully clear nor fully solid. */
  partialAlpha: number;
  firstPartialAlpha: { x: number; y: number } | null;
  /** Fully clear rows under the lowest solid pixel (the art's ground line). */
  bottomPadding: number;
  /** True when no pixel is solid. */
  empty: boolean;
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0');

/** Reads every pixel. Pixel art is small (decorations are at most 256 px). */
export async function inspectPixelArt(input: Buffer): Promise<PixelArtInspection> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const colours = new Map<string, number>();
  let partialAlpha = 0;
  let firstPartialAlpha: PixelArtInspection['firstPartialAlpha'] = null;
  let lowestSolid = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const alpha = data[i + 3];
      if (alpha === 0) continue;
      if (alpha !== 255) {
        partialAlpha++;
        firstPartialAlpha ??= { x, y };
        continue;
      }
      const hex = `#${hex2(data[i])}${hex2(data[i + 1])}${hex2(data[i + 2])}`;
      colours.set(hex, (colours.get(hex) ?? 0) + 1);
      lowestSolid = y;
    }
  }
  return {
    width,
    height,
    colours,
    partialAlpha,
    firstPartialAlpha,
    bottomPadding: lowestSolid < 0 ? height : height - 1 - lowestSolid,
    empty: lowestSolid < 0 && partialAlpha === 0,
  };
}

/** The same picture, pixel for pixel (fully clear pixels match whatever their colour). */
async function samePixels(a: Buffer, b: Buffer): Promise<boolean> {
  const [ra, rb] = await Promise.all(
    [a, b].map((buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }))
  );
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) return false;
  for (let i = 0; i < ra.data.length; i += 4) {
    if (ra.data[i + 3] !== rb.data[i + 3]) return false;
    if (ra.data[i + 3] === 0) continue;
    if (ra.data[i] !== rb.data[i] || ra.data[i + 1] !== rb.data[i + 1] || ra.data[i + 2] !== rb.data[i + 2]) {
      return false;
    }
  }
  return true;
}

/**
 * Pixel art (pixel-home decorations, custom assets): enforce byte and
 * dimension limits, then re-encode at the original size without changing a
 * pixel. Art with 256 colours or fewer becomes a palette PNG with no
 * dithering; anything else, or anything the palette encoder would alter, is
 * saved as a lossless full-colour PNG.
 *
 * `rejectPartialAlpha` turns away half-transparent pixels (the catalog's
 * art bible wants hard edges). Residents' own uploads don't set it.
 *
 * Throws ImageValidationError with a user-facing message.
 */
export async function preparePixelArtPng(
  input: Buffer,
  { maxBytes, maxDimension, rejectPartialAlpha = false }: { maxBytes: number; maxDimension: number; rejectPartialAlpha?: boolean }
): Promise<{ buffer: Buffer; width: number; height: number; inspection: PixelArtInspection }> {
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

  const inspection = await inspectPixelArt(input);
  if (rejectPartialAlpha && inspection.partialAlpha > 0) {
    const { x, y } = inspection.firstPartialAlpha!;
    throw new ImageValidationError(
      `${inspection.partialAlpha} pixel${inspection.partialAlpha === 1 ? ' is' : 's are'} partly see-through (the first is at ${x}, ${y}). Every pixel needs to be fully solid or fully clear.`
    );
  }

  const lossless = () => sharp(input).png({ compressionLevel: 9, palette: false }).toBuffer();
  let buffer: Buffer;
  // +1 leaves room for the transparent entry
  if (inspection.colours.size + 1 <= 256 && inspection.partialAlpha === 0) {
    const indexed = await sharp(input)
      .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0, quality: 100 })
      .toBuffer();
    buffer = (await samePixels(input, indexed)) ? indexed : await lossless();
  } else {
    buffer = await lossless();
  }
  return { buffer, width, height, inspection };
}
