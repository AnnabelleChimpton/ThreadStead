import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import type { UploadContext } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/server";
import { requireAction } from "@/lib/domain/users/capabilities";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import multer from "multer";
import { promisify } from "util";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";



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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for media
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

const uploadSingle = promisify(upload.single('image'));

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

async function checkUserQuota(userId: string): Promise<boolean> {
  // Check how many media items user has uploaded this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const mediaCount = await db.media.count({
    where: {
      userId,
      createdAt: { gte: monthStart }
    }
  });
  
  // Allow up to 50 media uploads per month
  return mediaCount < 50;
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
}> {
  const timestamp = Date.now();
  const baseKey = `media/${userId}/${timestamp}`;
  
  // Check if this is a MIDI file (check both MIME type and extension)
  const midiMimeTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi', 'audio/mid'];
  const isMidiByMime = midiMimeTypes.includes(mimeType);
  const isMidiByExtension = originalName.toLowerCase().endsWith('.mid') || 
                            originalName.toLowerCase().endsWith('.midi');
  const isMidi = isMidiByMime || isMidiByExtension;
  
  let uploads: Array<{ key: string; buffer: Buffer; size: string }>;
  let metadata: { width?: number; height?: number; fileSize: number };
  
  if (isMidi) {
    // For MIDI files, just upload the original file
    const extension = originalName.split('.').pop() || 'mid';
    uploads = [
      { key: `${baseKey}.${extension}`, buffer: buffer, size: 'full' },
      // Create placeholder entries for thumbnails (we'll use a MIDI icon on frontend)
      { key: `${baseKey}_thumb.${extension}`, buffer: buffer, size: 'thumbnail' },
      { key: `${baseKey}_medium.${extension}`, buffer: buffer, size: 'medium' },
    ];
    metadata = { fileSize: buffer.length };
  } else {
    // Get image metadata
    const imageInfo = await sharp(buffer).metadata();
    const originalWidth = imageInfo.width || 0;
    const originalHeight = imageInfo.height || 0;

    // Process images in different sizes based on context
    let thumbnail: Buffer, medium: Buffer, full: Buffer;

    if (uploadContext === 'threadring_badge') {
      // Badge-specific processing
      thumbnail = await sharp(buffer)
        .resize(88, 31, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png({ quality: 100 })
        .toBuffer();

      medium = await sharp(buffer)
        .resize(88, 31, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png({ quality: 100 })
        .toBuffer();

      full = await sharp(buffer)
        .resize(352, 124, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png({ quality: 100 })
        .toBuffer();
    } else {
      // Standard image processing
      thumbnail = await sharp(buffer)
        .resize(150, 150, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      medium = await sharp(buffer)
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      full = await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    const fileExtension = uploadContext === 'threadring_badge' ? 'png' : 'jpg';
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
                        uploadContext === 'threadring_badge' ? 'image/png' :
                        'image/jpeg';
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
      })
    );
    
    // Use CDN URL for public access if available, otherwise fallback to R2 public URL
    const baseUrl = process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL;
    urls[`${size}Url`] = `${baseUrl}/${key}`;
  }

  return {
    thumbnailUrl: urls.thumbnailUrl,
    mediumUrl: urls.mediumUrl,
    fullUrl: urls.fullUrl,
    metadata,
    mediaType: isMidi ? 'midi' : 'image',
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const me = await getSessionUser(req);
  if (!me) {
    return res.status(401).json({ error: "Not logged in" });
  }

  // Check rate limiting
  if (!checkRateLimit(me.id)) {
    return res.status(429).json({ 
      error: "Rate limit exceeded. Maximum 30 uploads per day." 
    });
  }

  // Check user quota
  if (!(await checkUserQuota(me.id))) {
    return res.status(413).json({ 
      error: "Monthly upload quota exceeded (50 images per month)" 
    });
  }

  try {
    // Handle file upload
    await uploadSingle(req as any, res as any);
    const file = (req as any).file;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate file type and size
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const allowedMidiTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi', 'audio/mid'];
    const allowedTypes = [...allowedImageTypes, ...allowedMidiTypes];

    // Check by MIME type first
    const isAllowedByMime = allowedTypes.includes(file.mimetype);

    // For MIDI files, also check by extension as fallback
    const isMidiByExtension = file.originalname.toLowerCase().endsWith('.mid') ||
                              file.originalname.toLowerCase().endsWith('.midi');

    // For HEIC files, also check by extension as fallback (mobile MIME types can be inconsistent)
    const isHeicByExtension = file.originalname.toLowerCase().endsWith('.heic') ||
                              file.originalname.toLowerCase().endsWith('.heif');

    if (!isAllowedByMime && !isMidiByExtension && !isHeicByExtension) {
      return res.status(400).json({
        error: "Invalid file type. Only JPEG, PNG, WebP, GIF, HEIC, and MIDI files are allowed."
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

    // Determine upload context and gallery visibility
    const uploadContext: UploadContext =
      context === 'post_embed' ? 'post_embed' :
      context === 'threadring_badge' ? 'threadring_badge' :
      'media_collection';
    const isGalleryItem = uploadContext === 'media_collection';

    // Process and upload media
    const { thumbnailUrl, mediumUrl, fullUrl, metadata, mediaType } = await processAndUploadMedia(
      file.buffer,
      me.id,
      file.mimetype,
      file.originalname,
      uploadContext
    );

    // Check if this should be featured (only for gallery items)
    let shouldFeature = false;
    let featuredOrder = null;

    if (isGalleryItem) {
      const featuredCount = await db.media.count({
        where: { userId: me.id, featured: true }
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
      message: shouldFeature 
        ? "Image uploaded and added to your featured media!" 
        : "Image uploaded successfully!"
    });

  } catch (error) {
    console.error("Media upload error:", error);
    
    if (error instanceof Error) {
      if (error.message === 'Only image, HEIC, and MIDI files are allowed') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('File too large')) {
        return res.status(413).json({ error: "File too large. Maximum size is 15MB." });
      }
      // Handle HEIC conversion errors from Sharp
      if (error.message.includes('heic') || error.message.includes('HEIC')) {
        return res.status(400).json({
          error: "HEIC file processing failed. Please try converting to JPEG first."
        });
      }
    }
    
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Disable Next.js body parser for multer
export const config = {
  api: {
    bodyParser: false,
  },
};

// Apply CSRF protection and rate limiting
export default withRateLimit('uploads')(withCsrfProtection(handler));