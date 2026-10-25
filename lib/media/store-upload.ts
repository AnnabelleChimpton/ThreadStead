/**
 * Storing an uploaded picture or song: its sizes rendered and put in the
 * bucket, ready for its Media row. The media page's uploads
 * (pages/api/media/upload.ts) and pictures copied from a resident's own
 * site (lib/media/page-pictures.ts) both come through here.
 */
import type { UploadContext } from "@prisma/client";
import { putObject } from "@/lib/storage/r2";
import { trimSoundBank } from "@/lib/audio/server/trim-sound-bank";
import {
  BADGE_HD_SIZE,
  BADGE_SIZE,
  containPng,
  ImageValidationError,
  imageDimensions,
  renderGifSizes,
  renderMediaSizes,
  renderMediaSizesKeepingFormat,
} from "@/lib/media/image";

export async function processAndUploadMedia(
  buffer: Buffer,
  userId: string,
  mimeType: string,
  originalName: string,
  uploadContext?: UploadContext
): Promise<{
  thumbnailUrl: string;
  mediumUrl: string;
  fullUrl: string;
  metadata: { width?: number; height?: number; fileSize: number };
  mediaType: string;
  soundBankUrl: string | null;
}> {
  const timestamp = Date.now();
  const baseKey = `media/${userId}/${timestamp}`;
  
  // Check if this is a MIDI file (check both MIME type and extension)
  const midiMimeTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi', 'audio/mid'];
  const isMidiByMime = midiMimeTypes.includes(mimeType);
  const isMidiByExtension = originalName.toLowerCase().endsWith('.mid') ||
                            originalName.toLowerCase().endsWith('.midi');
  const isMidi = isMidiByMime || isMidiByExtension;

  // Check if this is a GIF (preserve animation by skipping Sharp processing)
  const isGif = mimeType === 'image/gif' || originalName.toLowerCase().endsWith('.gif');

  let uploads: Array<{ key: string; buffer: Buffer; size: string }>;
  let metadata: { width?: number; height?: number; fileSize: number };

  if (isMidi) {
    // One copy: a song has no sizes (the row's thumbnail and medium URLs
    // point at it too)
    const extension = originalName.split('.').pop() || 'mid';
    uploads = [{ key: `${baseKey}.${extension}`, buffer: buffer, size: 'full' }];
    metadata = { fileSize: buffer.length };
  } else if (isGif) {
    // GIFs keep every frame: the full size is the upload itself (see renderGifSizes)
    const gifHeader = buffer.subarray(0, 6).toString('ascii');
    if (gifHeader !== 'GIF87a' && gifHeader !== 'GIF89a') {
      throw new ImageValidationError("That doesn't look like a GIF.");
    }
    const gif = await renderGifSizes(buffer);
    uploads = [
      { key: `${baseKey}.gif`, buffer: gif.full, size: 'full' },
      { key: `${baseKey}_medium.gif`, buffer: gif.medium, size: 'medium' },
      { key: `${baseKey}_thumb.gif`, buffer: gif.thumbnail, size: 'thumbnail' },
    ];
    metadata = { width: gif.width, height: gif.height, fileSize: buffer.length };
  } else {
    // Get image metadata
    const { width: originalWidth = 0, height: originalHeight = 0 } = await imageDimensions(buffer);

    // Process images in different sizes based on context
    let thumbnail: Buffer, medium: Buffer, full: Buffer;
    // PNG and WebP keep their format (transparency, pixel art); photos go to JPEG
    const keptFormat = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : null;

    if (uploadContext === 'threadring_badge') {
      // Badge-specific processing
      thumbnail = await containPng(buffer, BADGE_SIZE.width, BADGE_SIZE.height, { quality: 100 });
      medium = await containPng(buffer, BADGE_SIZE.width, BADGE_SIZE.height, { quality: 100 });
      full = await containPng(buffer, BADGE_HD_SIZE.width, BADGE_HD_SIZE.height, { quality: 100 });
    } else if (keptFormat) {
      ({ thumbnail, medium, full } = await renderMediaSizesKeepingFormat(buffer, keptFormat));
    } else {
      // Standard image processing
      ({ thumbnail, medium, full } = await renderMediaSizes(buffer));
    }

    const fileExtension = uploadContext === 'threadring_badge' ? 'png' : keptFormat ?? 'jpg';
    uploads = [
      { key: `${baseKey}_thumb.${fileExtension}`, buffer: thumbnail, size: 'thumbnail' },
      { key: `${baseKey}_medium.${fileExtension}`, buffer: medium, size: 'medium' },
      { key: `${baseKey}_full.${fileExtension}`, buffer: full, size: 'full' },
    ];
    
    metadata = {
      width: originalWidth,
      height: originalHeight,
      fileSize: buffer.length,
    };
  }

  const urls: Record<string, string> = {};

  for (const { key, buffer: imageBuffer, size } of uploads) {
    const contentType = isMidi ? mimeType :
                        isGif ? 'image/gif' :
                        key.endsWith('.png') ? 'image/png' :
                        key.endsWith('.webp') ? 'image/webp' :
                        'image/jpeg';
    urls[`${size}Url`] = await putObject({ key, body: imageBuffer, contentType });
  }

  // A song's own sound bank, so it plays through the sampler. If this
  // fails the song still uploads; its bank is made when it's first played.
  let soundBankUrl: string | null = null;
  if (isMidi) {
    try {
      const bank = await trimSoundBank(buffer);
      soundBankUrl = await putObject({ key: `${baseKey}.sf2`, body: bank, contentType: 'application/octet-stream' });
    } catch (error) {
      console.error(`[media:${baseKey}] Could not make the song's sound bank:`, error);
    }
  }

  return {
    thumbnailUrl: urls.thumbnailUrl ?? urls.fullUrl,
    mediumUrl: urls.mediumUrl ?? urls.fullUrl,
    fullUrl: urls.fullUrl,
    metadata,
    mediaType: isMidi ? 'midi' : isGif ? 'gif' : 'image',
    soundBankUrl,
  };
}
