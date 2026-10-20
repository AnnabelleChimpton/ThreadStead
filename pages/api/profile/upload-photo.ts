// The one avatar upload route — used by signup and the profile photo editor.
// (/api/user/photo was a second copy without CSRF or the Ring Hub sync.)
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { requireAction } from "@/lib/domain/users/capabilities";
import multer from "multer";
import { promisify } from "util";
import { notifyRingHubIfMember } from "@/lib/api/ringhub/ringhub-profile-sync";
import { putObject } from "@/lib/storage/r2";
import { avatarFormatFor, renderAvatarSizes } from "@/lib/media/image";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (modern phone cameras)
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

async function processAndUploadImage(
  buffer: Buffer,
  userId: string
): Promise<{ thumbnailUrl: string; mediumUrl: string; fullUrl: string }> {
  const baseKey = `profile-photos/${userId}/${Date.now()}`;
  // PNG and WebP keep their transparency as PNG; photos stay JPEG
  const format = await avatarFormatFor(buffer);
  const sizes = await renderAvatarSizes(buffer, format);
  const ext = format === 'png' ? 'png' : 'jpg';

  const put = (suffix: string, body: Buffer) =>
    putObject({ key: `${baseKey}_${suffix}.${ext}`, body, contentType: `image/${format}` });

  return {
    thumbnailUrl: await put('thumb', sizes.thumbnail),
    mediumUrl: await put('medium', sizes.medium),
    fullUrl: await put('full', sizes.full),
  };
}

export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "uploads" },
  async (req, res, { user: me }) => {
    // Check rate limiting
    if (!checkRateLimit(me.id)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Maximum 5 uploads per hour."
      });
    }

    try {
      // Handle file upload
      await uploadSingle(req as any, res as any);
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type and size (GIFs blocked for avatars - use media uploads instead)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: "Invalid file type. Only JPEG, PNG, and WebP are allowed. For animated GIFs, use media uploads."
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

      // Notify RingHub of avatar update if user is in any federated rings
      // (Fire-and-forget - don't wait for response or block on errors)
      notifyRingHubIfMember(me.id, db).catch(err => {
        console.error('Failed to notify RingHub of avatar update:', err);
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
          return res.status(413).json({ error: "File too large. Maximum size is 20MB." });
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
