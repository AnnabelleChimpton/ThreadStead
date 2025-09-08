import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
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
    fileSize: 2 * 1024 * 1024, // 2MB limit for emojis
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

const uploadSingle = promisify(upload.single('emoji'));

async function processAndUploadEmoji(
  buffer: Buffer,
  emojiName: string
): Promise<string> {
  const timestamp = Date.now();
  const key = `emojis/${emojiName}_${timestamp}.png`;
  
  // Process emoji image - resize to standard emoji size and convert to PNG
  const processedBuffer = await sharp(buffer)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90 })
    .toBuffer();

  // Upload to R2
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // 1 year cache
    })
  );
  
  // Use CDN URL for public access if available, otherwise fallback to R2 public URL
  const baseUrl = process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL;
  return `${baseUrl}/${key}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const user = await getSessionUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    // Handle file upload
    await uploadSingle(req as any, res as any);
    const file = (req as any).file;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG are allowed." 
      });
    }

    // Get emoji name from request body
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Emoji name is required" });
    }

    const emojiName = name.trim();

    // Validate emoji name (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(emojiName)) {
      return res.status(400).json({ error: "Emoji name can only contain letters, numbers, underscores, and hyphens" });
    }

    // Check if emoji name already exists
    const existingEmoji = await db.emoji.findUnique({
      where: { name: emojiName }
    });

    if (existingEmoji) {
      return res.status(409).json({ error: "Emoji name already exists" });
    }

    // Process and upload emoji
    const imageUrl = await processAndUploadEmoji(file.buffer, emojiName);

    // Create emoji record in database
    const emoji = await db.emoji.create({
      data: {
        name: emojiName,
        imageUrl,
        createdBy: user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true
              }
            },
            handles: {
              select: {
                handle: true
              },
              take: 1
            }
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      emoji,
      message: "Emoji uploaded successfully!"
    });

  } catch (error) {
    console.error("Emoji upload error:", error);
    
    if (error instanceof Error) {
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('File too large')) {
        return res.status(413).json({ error: "File too large. Maximum size is 2MB." });
      }
      if (error.message.includes('Missing required environment variable')) {
        return res.status(500).json({ error: "Server configuration error" });
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