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
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

const uploadSingle = promisify(upload.single('photo'));

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxUploads = 5; // 5 uploads per hour

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

async function checkUserQuota(_userId: string): Promise<boolean> {
  // Check how many photos user has uploaded this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  // For now, we'll store upload count in a simple way
  // In production, you might want a separate uploads table
  
  // Simple quota: allow upload if they don't have an avatar or it's been a while
  // In production, implement proper monthly quotas based on monthStart and userId
  return true; // For now, always allow
}

async function processAndUploadImage(
  buffer: Buffer,
  userId: string
): Promise<{ thumbnailUrl: string; mediumUrl: string; fullUrl: string }> {
  const timestamp = Date.now();
  const baseKey = `profile-photos/${userId}/${timestamp}`;
  
  // Process images in different sizes
  // Since users will crop to square, we expect square input, so use 'cover' to maintain aspect ratio
  const thumbnail = await sharp(buffer)
    .resize(64, 64, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer();
    
  const medium = await sharp(buffer)
    .resize(200, 200, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toBuffer();
    
  const full = await sharp(buffer)
    .resize(800, 800, { 
      fit: 'cover',
      position: 'center',
      withoutEnlargement: true
    })
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
      error: "Rate limit exceeded. Maximum 5 uploads per hour." 
    });
  }

  // Check user quota
  if (!(await checkUserQuota(me.id))) {
    return res.status(413).json({ 
      error: "Monthly upload quota exceeded" 
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
    const { cap } = req.body;
    if (!cap) {
      return res.status(401).json({ error: "Capability required" });
    }

    const resource = `user:${me.id}/profile`;
    const ok = await requireAction("write:profile", (resStr) => resStr === resource)(cap).catch(() => null);
    if (!ok) {
      return res.status(403).json({ error: "Invalid capability" });
    }

    // Process and upload image
    const urls = await processAndUploadImage(file.buffer, me.id);

    // Update user profile with new avatar URLs (all sizes)
    await db.profile.upsert({
      where: { userId: me.id },
      update: { 
        avatarUrl: urls.mediumUrl, // Keep medium as primary
        avatarThumbnailUrl: urls.thumbnailUrl,
        avatarMediumUrl: urls.mediumUrl,
        avatarFullUrl: urls.fullUrl,
      },
      create: { 
        userId: me.id, 
        avatarUrl: urls.mediumUrl,
        avatarThumbnailUrl: urls.thumbnailUrl,
        avatarMediumUrl: urls.mediumUrl,
        avatarFullUrl: urls.fullUrl,
      },
    });

    return res.status(200).json({
      success: true,
      urls,
      message: "Profile photo uploaded successfully"
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    if (error instanceof Error) {
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('File too large')) {
        return res.status(413).json({ error: "File too large. Maximum size is 10MB." });
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