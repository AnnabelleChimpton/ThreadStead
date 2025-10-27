import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { requireAction } from "@/lib/domain/users/capabilities";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

// Configure S3 client for R2
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const me = await getSessionUser(req);
  if (!me) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const mediaId = String(req.query.id || "");
  if (!mediaId) {
    return res.status(400).json({ error: "Media ID required" });
  }

  try {
    // Find the media item
    const media = await db.media.findUnique({
      where: { id: mediaId }
    });

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // Check ownership
    if (media.userId !== me.id) {
      return res.status(403).json({ error: "Not authorized to delete this media" });
    }

    // Check capability
    const { cap } = req.body;
    if (!cap) {
      return res.status(401).json({ error: "Capability required" });
    }

    const resource = `user:${me.id}/media`;
    const ok = await requireAction("write:media", (resStr) => resStr === resource)(cap).catch(() => null);
    if (!ok) {
      return res.status(403).json({ error: "Invalid capability" });
    }

    // Extract keys from URLs to delete from R2
    const baseUrl = process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL;
    const keysToDelete: string[] = [];

    if (media.thumbnailUrl) {
      const key = media.thumbnailUrl.replace(`${baseUrl}/`, '');
      keysToDelete.push(key);
    }
    if (media.mediumUrl) {
      const key = media.mediumUrl.replace(`${baseUrl}/`, '');
      keysToDelete.push(key);
    }
    if (media.fullUrl) {
      const key = media.fullUrl.replace(`${baseUrl}/`, '');
      keysToDelete.push(key);
    }

    // Delete from R2
    const s3 = getS3Client();
    for (const key of keysToDelete) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
        }));
      } catch (err) {
        console.error(`Failed to delete ${key} from R2:`, err);
        // Continue even if R2 deletion fails
      }
    }

    // Delete from database
    await db.media.delete({
      where: { id: mediaId }
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error deleting media:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('uploads')(withCsrfProtection(handler));