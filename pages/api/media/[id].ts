import { db } from "@/lib/config/database/connection";
import { requireAction } from "@/lib/domain/users/capabilities";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";

// Title/caption limits match the upload form (MediaUpload.tsx).
const updateMediaSchema = z.object({
  cap: z.string().min(1),
  title: z.string().trim().max(100).nullable().optional(),
  caption: z.string().trim().max(500).nullable().optional(),
});

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

export default apiHandler(
  { methods: ['DELETE', 'PATCH'], auth: 'user', rateLimit: 'uploads' },
  async (req, res, { user: me }) => {
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
        return res.status(403).json({ error: "Not authorized to change this media" });
      }

      // Check capability
      const { cap } = req.body ?? {};
      if (!cap) {
        return res.status(401).json({ error: "Capability required" });
      }

      const resource = `user:${me.id}/media`;
      const ok = await requireAction("write:media", (resStr) => resStr === resource)(cap).catch(() => null);
      if (!ok) {
        return res.status(403).json({ error: "Invalid capability" });
      }

      if (req.method === "PATCH") {
        const parsed = updateMediaSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
        }
        const { title, caption } = parsed.data;
        const data: { title?: string | null; caption?: string | null } = {};
        if (title !== undefined) data.title = title || null;
        if (caption !== undefined) data.caption = caption || null;

        const updated = await db.media.update({
          where: { id: mediaId },
          data,
          select: { id: true, title: true, caption: true },
        });
        return res.status(200).json({ media: updated });
      }

      // Extract keys from URLs to delete from R2
      const baseUrl = process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL;
      const keysToDelete: string[] = [];

      for (const url of [media.thumbnailUrl, media.mediumUrl, media.fullUrl]) {
        if (!url) continue;
        if (!baseUrl || !url.startsWith(`${baseUrl}/`)) {
          // Can't derive a bucket key — the object will be orphaned in R2.
          console.error(`[media:${mediaId}] Not deleting ${url} from R2: URL is not under ${baseUrl ?? "(no R2 base URL)"}`);
          continue;
        }
        keysToDelete.push(url.slice(baseUrl.length + 1));
      }

      // Delete from R2. A failure here leaves an orphaned object but shouldn't
      // block removing the record, so log each one loudly and carry on.
      const s3 = getS3Client();
      const failedKeys: string[] = [];
      for (const key of keysToDelete) {
        try {
          await s3.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
          }));
        } catch (err) {
          failedKeys.push(key);
          console.error(`[media:${mediaId}] Failed to delete ${key} from R2:`, err);
        }
      }
      if (failedKeys.length > 0) {
        console.error(`[media:${mediaId}] ${failedKeys.length}/${keysToDelete.length} R2 objects orphaned: ${failedKeys.join(", ")}`);
      }

      // Delete from database
      await db.media.delete({
        where: { id: mediaId }
      });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error(`Error handling ${req.method} for media ${mediaId}:`, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);