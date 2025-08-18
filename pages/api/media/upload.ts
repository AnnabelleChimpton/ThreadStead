import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import multer from "multer";
import { promisify } from "util";



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
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
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
  userId: string
): Promise<{
  thumbnailUrl: string;
  mediumUrl: string;
  fullUrl: string;
  metadata: { width: number; height: number; fileSize: number };
}> {
  const timestamp = Date.now();
  const baseKey = `media/${userId}/${timestamp}`;
  
  // Get image metadata
  const imageInfo = await sharp(buffer).metadata();
  const originalWidth = imageInfo.width || 0;
  const originalHeight = imageInfo.height || 0;
  
  // Process images in different sizes
  const thumbnail = await sharp(buffer)
    .resize(150, 150, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
    
  const medium = await sharp(buffer)
    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
    
  const full = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Upload all sizes to R2
  const uploads = [
    { key: `${baseKey}_thumb.jpg`, buffer: thumbnail, size: 'thumbnail' },
    { key: `${baseKey}_medium.jpg`, buffer: medium, size: 'medium' },
    { key: `${baseKey}_full.jpg`, buffer: full, size: 'full' },
  ];

  const urls: Record<string, string> = {};

  for (const { key, buffer: imageBuffer, size } of uploads) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
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
    metadata: {
      width: originalWidth,
      height: originalHeight,
      fileSize: buffer.length,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." 
      });
    }

    // Check capability
    const { cap, caption, title } = req.body;
    if (!cap) {
      return res.status(401).json({ error: "Capability required" });
    }

    const resource = `user:${me.id}/media`;
    const ok = await requireAction("write:media", (resStr) => resStr === resource)(cap).catch(() => null);
    if (!ok) {
      return res.status(403).json({ error: "Invalid capability" });
    }

    // Process and upload image
    const { thumbnailUrl, mediumUrl, fullUrl, metadata } = await processAndUploadMedia(
      file.buffer, 
      me.id
    );

    // Check if this should be featured (if user has < 6 featured media)
    const featuredCount = await db.media.count({
      where: { userId: me.id, featured: true }
    });
    
    const shouldFeature = featuredCount < 6;
    const featuredOrder = shouldFeature ? featuredCount + 1 : null;

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
        width: metadata.width,
        height: metadata.height,
        featured: shouldFeature,
        featuredOrder,
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
        createdAt: mediaRecord.createdAt,
      },
      message: shouldFeature 
        ? "Image uploaded and added to your featured media!" 
        : "Image uploaded successfully!"
    });

  } catch (error) {
    console.error("Media upload error:", error);
    
    if (error instanceof Error) {
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('File too large')) {
        return res.status(413).json({ error: "File too large. Maximum size is 15MB." });
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