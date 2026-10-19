// The profile banner: one wide image across the top of the profile header.
// POST uploads (multipart field "banner", plus a write:profile capability),
// DELETE takes it off. Same shape as upload-photo.ts.
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { requireAction } from "@/lib/domain/users/capabilities";
import multer from "multer";
import { promisify } from "util";
import { putObject } from "@/lib/storage/r2";
import { renderBanner } from "@/lib/media/image";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});
const uploadSingle = promisify(upload.single('banner'));

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// A few banners an hour is plenty
const recentUploads = new Map<string, { count: number; resetTime: number }>();
function underHourlyLimit(userId: string, max = 5): boolean {
  const now = Date.now();
  const entry = recentUploads.get(userId);
  if (!entry || now > entry.resetTime) {
    recentUploads.set(userId, { count: 1, resetTime: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

async function capabilityOk(cap: unknown, userId: string): Promise<boolean> {
  if (typeof cap !== 'string' || !cap) return false;
  const resource = `user:${userId}/profile`;
  const ok = await requireAction("write:profile", (r) => r === resource)(cap).catch(() => null);
  return !!ok;
}

export default apiHandler(
  { methods: ["POST", "DELETE"], auth: "user", rateLimit: "uploads" },
  async (req, res, { user: me }) => {
    if (req.method === "DELETE") {
      const cap = typeof req.query.cap === 'string' ? req.query.cap : undefined;
      if (!(await capabilityOk(cap, me.id))) return res.status(403).json({ error: "Invalid capability" });
      await db.profile.update({ where: { userId: me.id }, data: { bannerUrl: null } });
      return res.status(200).json({ success: true });
    }

    if (!underHourlyLimit(me.id)) {
      return res.status(429).json({ error: "That's a lot of banners. Try again in an hour." });
    }

    try {
      await uploadSingle(req as any, res as any);
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ error: "Banners can be JPEG, PNG or WebP." });
      }
      if (!(await capabilityOk(req.body?.cap, me.id))) {
        return res.status(403).json({ error: "Invalid capability" });
      }

      const body = await renderBanner(file.buffer);
      const bannerUrl = await putObject({
        key: `profile-banners/${me.id}/${Date.now()}.jpg`,
        body,
        contentType: 'image/jpeg',
      });

      await db.profile.upsert({
        where: { userId: me.id },
        update: { bannerUrl },
        create: { userId: me.id, bannerUrl },
      });

      return res.status(200).json({ success: true, bannerUrl });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Only image files are allowed') return res.status(400).json({ error: error.message });
        if (error.message.includes('File too large')) {
          return res.status(413).json({ error: "That image is over 20 MB." });
        }
      }
      console.error("Banner upload error:", error);
      return res.status(500).json({ error: "Couldn't save the banner. Try again." });
    }
  }
);

export const config = {
  api: {
    bodyParser: false,
  },
};
