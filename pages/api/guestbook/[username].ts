import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { requireAction } from "@/lib/domain/users/capabilities";
import { createGuestbookNotification } from "@/lib/domain/notifications";
import { SITE_NAME } from "@/lib/config/site/constants";
import { residentAccess, sendPrivateProfile } from "@/lib/domain/users/profile-access";


export default apiHandler(
  // GET follows the profile's visibility; POST is gated by the
  // write:guestbook capability below, not by the session.
  { methods: ["GET", "POST"], auth: "optional", rateLimit: "guestbook" },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    if (!username) return res.status(400).json({ error: "username required" });

    const ownerHandle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: { user: true },
    });
    if (!ownerHandle) return res.status(404).json({ error: "not found" });

    if (req.method === "GET") {
      const access = await residentAccess(viewer, ownerHandle.user.id);
      if (!access.visible) {
        // The profile page still shows across a block (its posts API answers
        // with an empty list), so the guestbook does the same there.
        if (access.blocked) return res.json({ entries: [] });
        return sendPrivateProfile(res, access.visibility);
      }

      const entries = await db.guestbookEntry.findMany({
        where: { profileOwner: ownerHandle.user.id, status: "visible" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Get unique author IDs (excluding null values)
      const authorIds = [...new Set(entries.map(e => e.authorId).filter(Boolean))];

      // Fetch handles for these authors
      const authorHandles = await db.handle.findMany({
        where: {
          userId: { in: authorIds as string[] },
          host: SITE_NAME
        },
        select: {
          userId: true,
          handle: true
        }
      });

      // Create a map of userId -> handle
      const userHandleMap = new Map(authorHandles.map(h => [h.userId, h.handle]));

      // Transform entries to include username
      const transformedEntries = entries.map(entry => ({
        ...entry,
        authorUsername: entry.authorId ? userHandleMap.get(entry.authorId) || null : null
      }));

      return res.json({ entries: transformedEntries });
    }

    // POST
    const { message, cap } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message required" });
    }
    if (!cap || typeof cap !== "string") {
      return res.status(401).json({ error: "capability required" });
    }

    // resource for this profile's guestbook
    const resource = `user:${ownerHandle.user.id}/guestbook`;

    // validate capability
    const ok = await requireAction("write:guestbook", (resStr) => resStr === resource)(cap)
      .catch(() => null);
    if (!ok) return res.status(403).json({ error: "invalid capability" });

    // Nobody signs a guestbook they can't see, or across a block
    const access = await residentAccess({ id: ok.sub }, ownerHandle.user.id);
    if (!access.visible) return sendPrivateProfile(res, access.visibility);

    const entry = await db.guestbookEntry.create({
      data: {
        profileOwner: ownerHandle.user.id,
        authorId: ok.sub, // the userId from the cap
        message: message.trim(),
      },
    });

    // Create guestbook notification
    await createGuestbookNotification(ownerHandle.user.id, ok.sub, entry.id);

    const entries = await db.guestbookEntry.findMany({
      where: { profileOwner: ownerHandle.user.id, status: "visible" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get unique author IDs (excluding null values)
    const authorIds = [...new Set(entries.map(e => e.authorId).filter(Boolean))];

    // Fetch handles for these authors
    const authorHandles = await db.handle.findMany({
      where: {
        userId: { in: authorIds as string[] },
        host: SITE_NAME
      },
      select: {
        userId: true,
        handle: true
      }
    });

    // Create a map of userId -> handle
    const userHandleMap = new Map(authorHandles.map(h => [h.userId, h.handle]));

    // Transform entries to include username
    const transformedEntries = entries.map(entry => ({
      ...entry,
      authorUsername: entry.authorId ? userHandleMap.get(entry.authorId) || null : null
    }));

    return res.status(201).json({ entries: transformedEntries });
  }
);
