import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { residentAccess } from "@/lib/domain/users/profile-access";
import { scheduleHomeSnapshot } from "@/lib/pixel-homes/snapshot/service";

/**
 * GET /api/home/<handle>/snapshot[?size=card] → 302 to the yard's share
 * image on the CDN, drawing it first if it doesn't exist yet. It's the
 * og:image for a home whose snapshot hasn't been drawn, so the first link
 * preview gets a picture. Same answer for everyone: a home a signed-out
 * visitor can't see is a 404, whoever asks.
 */
export default apiHandler(
  { methods: ["GET"], auth: "none", rateLimit: "default" },
  async (req, res) => {
    const { handle, size } = req.query;
    if (typeof handle !== "string") return res.status(400).json({ error: "Invalid handle" });
    const cleanHandle = (handle.startsWith("@") ? handle.slice(1) : handle).toLowerCase();

    const userHandle = await db.handle.findFirst({
      where: { handle: cleanHandle },
      select: { userId: true },
    });
    if (!userHandle) return res.status(404).json({ error: "Not found" });
    const userId = userHandle.userId;

    const access = await residentAccess(null, userId);
    if (!access.visible) return res.status(404).json({ error: "Not found" });

    let stored = await db.userHomeConfig.findUnique({
      where: { userId },
      select: { snapshotUrl: true, snapshotCardUrl: true },
    });
    if (stored && !stored.snapshotUrl) {
      const result = await scheduleHomeSnapshot(userId);
      if (result?.status === "rendered" || result?.status === "unchanged") {
        stored = { snapshotUrl: result.url, snapshotCardUrl: result.cardUrl };
      }
    }

    const url = size === "card" ? stored?.snapshotCardUrl : stored?.snapshotUrl;
    if (!url) return res.status(404).json({ error: "Not found" });

    // Short: the target changes whenever the yard is redrawn.
    res.setHeader("Cache-Control", "public, max-age=300");
    res.redirect(302, url);
  }
);
