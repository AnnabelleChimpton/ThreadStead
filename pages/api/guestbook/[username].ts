import { db } from "@/lib/config/database/connection";

import { apiHandler } from "@/lib/api/handler";
import { requireAction } from "@/lib/domain/users/capabilities";
import { AccountHiddenError } from "@/lib/domain/users/moderation";
import { createGuestbookNotification } from "@/lib/domain/notifications";
import { SITE_NAME } from "@/lib/config/site/constants";
import { residentAccess, sendPrivateProfile } from "@/lib/domain/users/profile-access";
import { limitIdentifier, rateLimitCheck } from "@/lib/server/http/rate-limit";
import { validationMessage } from "@/lib/api/validation";
import { z } from "zod";

/** The forms cap a note at 2000 characters (Guestbook.tsx, pages/act/guestbook) */
const signSchema = z.object({
  message: z.string().trim().min(1, "Write a note first.").max(2000),
  cap: z.string().max(5000).optional(),
});


export default apiHandler(
  // GET follows the profile's visibility; POST is gated by the
  // write:guestbook capability below, not by the session.
  // Rate limits are by method (below): reading counted against signing,
  // so readers sharing an IP (everyone on a resident's own address is
  // signed out) ran out of reads.
  { methods: ["GET", "POST"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    if (!(await rateLimitCheck(req, res, req.method === "GET" ? "reads" : "guestbook", viewer?.id))) return;
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
    // Any length went in before, up to the body limit
    const parsed = signSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error.issues) });
    const { message, cap } = parsed.data;
    if (!cap) {
      return res.status(401).json({ error: "capability required" });
    }

    // resource for this profile's guestbook
    const resource = `user:${ownerHandle.user.id}/guestbook`;

    // validate capability
    const ok = await requireAction("write:guestbook", (resStr) => resStr === resource)(cap)
      .catch((error) => {
        // Suspended, banned or leaving since the token was minted: apiHandler says which
        if (error instanceof AccountHiddenError) throw error;
        return null;
      });
    if (!ok) return res.status(403).json({ error: "invalid capability" });

    // Nobody signs a guestbook they can't see, or across a block
    const access = await residentAccess({ id: ok.sub }, ownerHandle.user.id);
    if (!access.visible) return sendPrivateProfile(res, access.visibility);

    // A few notes to one guestbook a day each, and a ceiling for the
    // guestbook that one person can't reach under that cap
    if (!(await limitIdentifier(res, `${ok.sub}:${ownerHandle.user.id}`, "guestbook_pair",
      () => `You've signed ${ownerHandle.handle}'s guestbook a few times today. Try again tomorrow.`))) return;
    if (!(await limitIdentifier(res, ownerHandle.user.id, "guestbook_target",
      () => `${ownerHandle.handle}'s guestbook has had lots of notes today. Try again tomorrow.`))) return;

    const entry = await db.guestbookEntry.create({
      data: {
        profileOwner: ownerHandle.user.id,
        authorId: ok.sub, // the userId from the cap
        message,
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

    // entry: the one just signed, for the way back to it (pages/act/guestbook)
    return res.status(201).json({ entries: transformedEntries, entry: { id: entry.id } });
  }
);
