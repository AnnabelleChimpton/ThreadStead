/**
 * Leaving: a resident deletes their own account (Settings > Privacy).
 *
 * They confirm by typing their username; their account is then hidden from
 * everyone else at once (deletesAt set; see lib/domain/users/moderation.ts)
 * and deleted LEAVE_GRACE_DAYS later by finishDueLeaves. Until then they can
 * still sign in and stay after all. The delete itself is the admin's
 * (eraseAccount in account-removal.ts) without the audit row, and with their
 * username held for a year rather than for good (forever if it was a
 * Bluesky handle, or if they were banned meanwhile; lib/domain/users/handle-tombstones.ts).
 *
 * A ring they own that still has other members needs a new owner first
 * (ring members page), so nobody is left with a ring no one can moderate. A
 * ring where they're the only member is deleted with them.
 */
import { db } from "@/lib/config/database/connection";
import { ApiError } from "@/lib/api/errors";
import { invalidateServedDids } from "@/lib/domain/bluesky/served-dids";
import { eraseAccount, listUserRingMemberships, sharedOwnedRings } from "@/lib/domain/users/account-removal";
import { disconnectChat, retierIndieSites } from "@/lib/domain/users/moderation";
import { decryptEmail } from "@/lib/utils/security/email-encryption";
import { sendLeavingEmail } from "@/lib/email-login";

export const LEAVE_GRACE_DAYS = 14;
/** A delete still stuck this long past its date goes through anyway, like an admin's `force`. */
export const FORCE_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RingToHandOver {
  slug: string;
  name: string;
}

/** Rings they own that still have other members; null when the hub couldn't say. */
export async function ringsToHandOver(userId: string): Promise<RingToHandOver[] | null> {
  const rings = await listUserRingMemberships(userId);
  if (rings.error) return null;
  try {
    const shared = await sharedOwnedRings(userId, rings.memberships);
    return shared.map((r) => ({ slug: r.ringSlug, name: r.ringName }));
  } catch {
    return null;
  }
}

/** Start leaving: hidden now, deleted in LEAVE_GRACE_DAYS. Returns when it goes. */
export async function startLeaving(userId: string, typedUsername: string, now = new Date()): Promise<Date> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, primaryHandle: true, deletesAt: true, encryptedEmail: true, emailVerifiedAt: true },
  });
  if (!user) throw new ApiError(404, "User not found");
  if (user.deletesAt) return user.deletesAt;
  if (user.role === "admin") throw new ApiError(400, "An admin account can't be deleted from here.");
  const username = user.primaryHandle?.split("@")[0].toLowerCase() ?? "";
  if (!username || typedUsername.trim().toLowerCase() !== username) {
    throw new ApiError(400, "That isn't your username.");
  }

  const rings = await ringsToHandOver(userId);
  if (rings === null) throw new ApiError(503, "I couldn't check your rings just now. Try again in a minute.");
  if (rings.length > 0) throw new ApiError(409, "Hand your rings over first.", { rings });

  const deletesAt = new Date(now.getTime() + LEAVE_GRACE_DAYS * DAY_MS);
  await db.user.update({ where: { id: userId }, data: { deletesAt } });
  // Their address stops answering as their Bluesky handle, chat takes them as
  // a guest, and their sites and vouches stop counting in the Indie Index
  invalidateServedDids();
  disconnectChat(userId);
  await retierIndieSites(userId, now);

  if (user.encryptedEmail && user.emailVerifiedAt) {
    try {
      await sendLeavingEmail(decryptEmail(user.encryptedEmail), username, deletesAt);
    } catch (error) {
      console.error("Couldn't send the leaving email:", error);
    }
  }
  return deletesAt;
}

/** Stay after all: visible again, nothing deleted. Too late once the date has come: deleting has begun. */
export async function stayAfterAll(userId: string, now = new Date()): Promise<void> {
  const { count } = await db.user.updateMany({
    where: { id: userId, OR: [{ deletesAt: null }, { deletesAt: { gt: now } }] },
    data: { deletesAt: null },
  });
  if (count === 0) throw new ApiError(409, "It's already being deleted.");
  invalidateServedDids();
  disconnectChat(userId);
  await retierIndieSites(userId, now);
}

/**
 * Delete the accounts whose time has come, all of them, so one that can't go
 * yet (a hub step failed, or a ring they own gained members) never holds up
 * the rest. That one stays hidden, is tried again next time, and shows as
 * overdue to admins; FORCE_AFTER_DAYS past its date it goes anyway, leaving
 * any ring it still owns with an owner who is gone.
 */
export async function finishDueLeaves(now = new Date()): Promise<{ deleted: number; waiting: number }> {
  const due = await db.user.findMany({
    where: { deletesAt: { lte: now } },
    select: { id: true, primaryHandle: true, moderationStatus: true, deletesAt: true },
    orderBy: { deletesAt: "asc" },
  });
  let deleted = 0;
  for (const user of due) {
    try {
      const rings = await listUserRingMemberships(user.id);
      if (rings.error) throw new Error(rings.error);
      const result = await eraseAccount(user.id, user.primaryHandle, rings, {
        hubReason: "The resident deleted their account",
        // Banned while leaving: their name is held for good, as an admin's delete would
        removedForAbuse: user.moderationStatus === "banned",
        force: now.getTime() - user.deletesAt!.getTime() >= FORCE_AFTER_DAYS * DAY_MS,
      });
      if (result.deleted) deleted++;
      else console.warn(`Leaving: ${user.primaryHandle} can't go yet (${result.blockedBy}): ${result.report.failures.join("; ")}`);
    } catch (error) {
      console.error(`Leaving: deleting ${user.primaryHandle} failed:`, error);
    }
  }
  return { deleted, waiting: due.length - deleted };
}
