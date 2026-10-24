import { db } from "@/lib/config/database/connection";
import type { UploadContext } from "@prisma/client";

import { requireAction } from "@/lib/domain/users/capabilities";
import multer from "multer";
import { promisify } from "util";
import { apiHandler } from "@/lib/api/handler";
import { rateLimitCheck } from "@/lib/server/http/rate-limit";
import { putObject } from "@/lib/storage/r2";
import { trimSoundBank } from "@/lib/audio/server/trim-sound-bank";
import { PAGE_ASSET_CONTEXT, PAGE_ASSET_UPLOAD } from "@/lib/media/upload-context";
import { checkSong, SongCheckError } from "@/lib/audio/server/check-song";
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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for media (modern phone cameras)
  },
  fileFilter: (req, file, cb) => {
    // Allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    // Allow MIDI files (check both MIME type and extension)
    const midiMimeTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi', 'audio/mid'];
    const isMidiByMime = midiMimeTypes.includes(file.mimetype);
    const isMidiByExtension = file.originalname.toLowerCase().endsWith('.mid') ||
                              file.originalname.toLowerCase().endsWith('.midi');

    // Allow HEIC files (check by extension since MIME types can be inconsistent on mobile)
    const isHeicByExtension = file.originalname.toLowerCase().endsWith('.heic') ||
                              file.originalname.toLowerCase().endsWith('.heif');

    if (isMidiByMime || isMidiByExtension || isHeicByExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only image, HEIC, and MIDI files are allowed'));
    }
  },
});

// The file comes as "file". "image" was its old name (it took songs too);
// it's still accepted so a page loaded before a deploy can upload.
const uploadOne = promisify(upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]));
type UploadedFiles = { file?: Express.Multer.File[]; image?: Express.Multer.File[] };

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours (1 day)
  const maxUploads = 30; // 30 media uploads per day

  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxUploads) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

const PHOTOS_PER_MONTH = 50;
// Songs have their own allowance, so music never uses up photo uploads
const SONGS_PER_MONTH = 10;

/** Room for another photo, or another song, this month */
async function checkUserQuota(userId: string, kind: 'photo' | 'song'): Promise<boolean> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await db.media.count({
    where: {
      userId,
      createdAt: { gte: monthStart },
      mediaType: kind === 'song' ? 'midi' : { not: 'midi' },
    },
  });
  return count < (kind === 'song' ? SONGS_PER_MONTH : PHOTOS_PER_MONTH);
}

async function processAndUploadMedia(
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

export default apiHandler(
  // Rate limited below, once the file has passed its checks: a refused
  // upload used to use up the hourly and daily allowance too
  { methods: ['POST'], auth: 'user' },
  async (req, res, { user: me }) => {
    try {
      // Handle file upload
      await uploadOne(req as any, res as any);
      const files = ((req as any).files ?? {}) as UploadedFiles;
      const file = files.file?.[0] ?? files.image?.[0];
    
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type and size (HEIC removed - handled by client-side compression)
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const allowedMidiTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi', 'audio/mid'];
      const allowedTypes = [...allowedImageTypes, ...allowedMidiTypes];

      // Check by MIME type first
      const isAllowedByMime = allowedTypes.includes(file.mimetype);

      // For MIDI files, also check by extension as fallback
      const isMidiByExtension = file.originalname.toLowerCase().endsWith('.mid') ||
                                file.originalname.toLowerCase().endsWith('.midi');

      if (!isAllowedByMime && !isMidiByExtension) {
        return res.status(400).json({
          error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and MIDI files are allowed. (HEIC files are automatically converted on upload)"
        });
      }

      // Content-based validation for anything treated as MIDI: the MIME type
      // and extension are client-controlled, so require the real "MThd" magic
      // bytes before storing. Without this a file named song.mid could hold
      // HTML and later be served inline from our origin (stored XSS).
      // (Matches processAndUploadMedia's test, so nothing stored as a song skips this)
      const treatedAsMidi = allowedMidiTypes.includes(file.mimetype) || isMidiByExtension;
      if (treatedAsMidi) {
        const head = file.buffer as Buffer;
        if (head.length < 4 || head.toString('ascii', 0, 4) !== 'MThd') {
          return res.status(400).json({ error: "That doesn't look like a MIDI file." });
        }
        // Enforce the 1MB MIDI limit the client and docs promise (the multer
        // cap is 25MB for camera photos).
        if (head.length > 1024 * 1024) {
          return res.status(400).json({ error: "MIDI files must be 1MB or smaller." });
        }
        // Read it the way the player will: a header alone isn't a song
        try {
          checkSong(head);
        } catch (error) {
          if (error instanceof SongCheckError) return res.status(400).json({ error: error.message });
          throw error;
        }
      }

      // A picture has to be one we can read before it counts against anything
      // (the full check runs while it's processed)
      if (!treatedAsMidi) {
        const { width } = await imageDimensions(file.buffer).catch(() => ({ width: undefined }));
        if (!width) {
          return res.status(400).json({
            error: file.mimetype === 'image/gif' ? "That doesn't look like a GIF." : "That file isn't a picture we can read.",
          });
        }
      }

      // Photos and songs each have their own monthly allowance
      if (!(await checkUserQuota(me.id, treatedAsMidi ? 'song' : 'photo'))) {
        return res.status(413).json({
          error: treatedAsMidi
            ? `You can add ${SONGS_PER_MONTH} songs a month. There's room for more next month.`
            : `You can add ${PHOTOS_PER_MONTH} photos a month. There's room for more next month.`,
        });
      }

      // Check capability
      const { cap, caption, title, context, ringSlug } = req.body;
      if (!cap) {
        return res.status(401).json({ error: "Capability required" });
      }

      const resource = `user:${me.id}/media`;
      const ok = await requireAction("write:media", (resStr) => resStr === resource)(cap).catch(() => null);
      if (!ok) {
        return res.status(403).json({ error: "Invalid capability" });
      }

      // Counted only now, for an upload that's going ahead
      if (!(await rateLimitCheck(req, res, 'uploads', me.id))) return;
      if (!checkRateLimit(me.id)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Maximum 30 uploads per day."
        });
      }

      // Determine upload context and gallery visibility
      const uploadContext: UploadContext =
        context === 'post_embed' ? 'post_embed' :
        context === 'threadring_badge' ? 'threadring_badge' :
        context === PAGE_ASSET_UPLOAD ? PAGE_ASSET_CONTEXT :
        'media_collection';
      const isGalleryItem = uploadContext === 'media_collection';

      // Process and upload media
      const { thumbnailUrl, mediumUrl, fullUrl, metadata, mediaType, soundBankUrl } = await processAndUploadMedia(
        file.buffer,
        me.id,
        file.mimetype,
        file.originalname,
        uploadContext
      );

      // Check if this should be featured (only for gallery items)
      let shouldFeature = false;
      let featuredOrder = null;

      // Songs are never featured photos, and don't take photo slots
      if (isGalleryItem && mediaType !== 'midi') {
        const featuredCount = await db.media.count({
          where: { userId: me.id, featured: true, mediaType: { not: 'midi' } }
        });

        shouldFeature = featuredCount < 6;
        featuredOrder = shouldFeature ? featuredCount + 1 : null;
      }

      // Save media record to database
      const mediaRecord = await db.media.create({
        data: {
          userId: me.id,
          caption: caption?.trim() || null,
          title: title?.trim() || null,
          thumbnailUrl,
          mediumUrl,
          fullUrl,
          originalName: file.originalname,
          fileSize: metadata.fileSize,
          mimeType: file.mimetype,
          mediaType,
          soundBankUrl,
          width: metadata.width || null,
          height: metadata.height || null,
          featured: shouldFeature,
          featuredOrder,
          uploadContext,
          isGalleryItem,
        },
      });

      return res.status(200).json({
        success: true,
        media: {
          id: mediaRecord.id,
          caption: mediaRecord.caption,
          title: mediaRecord.title,
          thumbnailUrl: mediaRecord.thumbnailUrl,
          mediumUrl: mediaRecord.mediumUrl,
          fullUrl: mediaRecord.fullUrl,
          featured: mediaRecord.featured,
          mediaType: mediaRecord.mediaType,
          createdAt: mediaRecord.createdAt,
        },
        message: mediaType === 'midi'
          ? "Song added."
          : shouldFeature
            ? "Photo added to your featured photos."
            : "Photo added."
      });

    } catch (error) {
      if (error instanceof ImageValidationError) {
        return res.status(400).json({ error: error.message });
      }
      // A file under any other field name, or more than one file
      if (error instanceof multer.MulterError && (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT')) {
        return res.status(400).json({ error: 'Send one file, in the "file" field.' });
      }
      console.error("Media upload error:", error);

      if (error instanceof Error) {
        if (error.message === 'Only image, HEIC, and MIDI files are allowed') {
          return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('File too large')) {
          return res.status(413).json({ error: "File too large. Maximum size is 25MB." });
        }
      }
    
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Disable Next.js body parser for multer
export const config = {
  api: {
    bodyParser: false,
  },
};