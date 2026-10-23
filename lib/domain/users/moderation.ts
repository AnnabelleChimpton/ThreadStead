/**
 * Account moderation: suspend (until a date), ban, lift.
 *
 * A suspended or banned account ("restricted"):
 *  - can't sign in, and its sessions end (getSessionUser and createSession in
 *    lib/auth/server.ts refuse it, so every route that needs a session, and
 *    the chat socket, treats it as signed out);
 *  - can't write with a capability token minted before the action
 *    (requireAction in lib/domain/users/capabilities.ts);
 *  - drops out of every list of people (visibleResidentWhere), its own pages
 *    404 (residentAccess), and its posts, comments and chat messages leave
 *    feeds, search, room history and DMs (getHiddenIds in
 *    lib/domain/users/blocks.ts, activeAccountSql below);
 *  - stops counting in the Indie Index: its sites lose the resident tier and
 *    its signals and vouches stop counting (lib/indie-index/tiers.ts).
 *
 * A suspension ends by itself at suspendedUntil; nothing has to run. Every
 * action leaves a ModerationAction row. Hard delete is a separate, later step
 * (lib/domain/users/account-removal.ts) and only for a banned account.
 */
import { Prisma, type ModerationActionType, type ModerationStatus } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { ApiError } from "@/lib/api/errors";
import { recomputeSites, sitesTouchedBy } from "@/lib/indie-index/tiers";
import { invalidateServedDids } from "@/lib/domain/bluesky/served-dids";

export type ModerationFields = {
  moderationStatus: ModerationStatus;
  suspendedUntil: Date | null;
};

export const MODERATION_SELECT = { moderationStatus: true, suspendedUntil: true } as const;

/** Longest reason we keep (the hub's curate reason allows 500 too). */
export const MAX_REASON_LENGTH = 500;

/** Banned, or suspended with an end date still ahead (no date = until lifted). */
export function isRestricted(user: ModerationFields | null | undefined, now = new Date()): boolean {
  if (!user) return false;
  if (user.moderationStatus === "banned") return true;
  if (user.moderationStatus === "suspended") return !user.suspendedUntil || user.suspendedUntil > now;
  return false;
}

/** What the account is right now: a suspension past its end date reads as active. */
export function effectiveStatus(user: ModerationFields, now = new Date()): ModerationStatus {
  return isRestricted(user, now) ? user.moderationStatus : "active";
}

/** Prisma filter: accounts that aren't suspended or banned. */
export function activeUserWhere(now = new Date()): Prisma.UserWhereInput {
  return {
    OR: [{ moderationStatus: "active" }, { moderationStatus: "suspended", suspendedUntil: { lte: now } }],
  };
}

/** Prisma filter: accounts that are suspended or banned right now. */
export function restrictedUserWhere(now = new Date()): Prisma.UserWhereInput {
  return {
    OR: [
      { moderationStatus: "banned" },
      { moderationStatus: "suspended", OR: [{ suspendedUntil: null }, { suspendedUntil: { gt: now } }] },
    ],
  };
}

/**
 * The raw-SQL form of activeUserWhere, for search. `userId` is the column
 * holding the account id. Compares against the database clock in UTC, the
 * way Prisma stores DateTime (see lib/indie-index/sql.ts on timezones).
 */
export function activeAccountSql(userId: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "User" mu
    WHERE mu.id = ${userId}
      AND (mu."moderationStatus" = 'active'
        OR (mu."moderationStatus" = 'suspended' AND mu."suspendedUntil" <= (now() AT TIME ZONE 'UTC')))
  )`;
}

/** Ids of every account suspended or banned right now. Usually a handful. */
export async function getRestrictedUserIds(): Promise<string[]> {
  const rows = await db.user.findMany({ where: restrictedUserWhere(), select: { id: true } });
  return rows.map((row) => row.id);
}

export async function isUserRestricted(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: MODERATION_SELECT });
  return isRestricted(user);
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** What a restricted person is told when they try to sign in. */
export function restrictionMessage(user: ModerationFields): string {
  if (user.moderationStatus === "banned") return "This account is banned.";
  return user.suspendedUntil
    ? `This account is suspended until ${formatDay(user.suspendedUntil)}.`
    : "This account is suspended.";
}

/** Sign-in refused: 403 with the message above and `code: "account_restricted"`. */
export class AccountRestrictedError extends ApiError {
  constructor(user: ModerationFields) {
    super(403, restrictionMessage(user), { code: "account_restricted" });
    this.name = "AccountRestrictedError";
  }
}

/** Throws AccountRestrictedError when `userId` may not start a session. */
export async function assertCanSignIn(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: MODERATION_SELECT });
  if (user && isRestricted(user)) throw new AccountRestrictedError(user);
}

// ---------------------------------------------------------------- actions --

export type ModerationActionInput =
  | { action: "suspend"; until: Date; reason: string }
  | { action: "ban"; reason: string }
  | { action: "lift"; reason?: string };

export interface ModerateUserOptions {
  /** The admin taking the action. */
  actorId: string;
  userId: string;
  /** Resolve this report with the action (it must be about this account). */
  reportId?: string;
  now?: Date;
}

export interface ModerationResult {
  userId: string;
  handle: string | null;
  moderationStatus: ModerationStatus;
  suspendedUntil: Date | null;
  actionId: string;
}

/** The report a moderation action resolves, checked against the account. */
async function reportFor(reportId: string, userId: string) {
  const report = await db.userReport.findUnique({
    where: { id: reportId },
    select: { id: true, reportType: true, targetId: true, reportedUserId: true },
  });
  if (!report) throw new ApiError(404, "Report not found");
  const about = report.reportedUserId ?? (report.reportType === "user" ? report.targetId : null);
  if (about !== userId) throw new ApiError(400, "That report is about someone else");
  return report;
}

function resolutionText(input: ModerationActionInput): string {
  const why = input.reason ? `: ${input.reason}` : "";
  switch (input.action) {
    case "suspend":
      return `Suspended until ${formatDay(input.until)}${why}`;
    case "ban":
      return `Banned${why}`;
    case "lift":
      return `Suspension or ban lifted${why}`;
  }
}

/** Kick the account's open chat sockets (lib/chat/socket-server.ts registers this). */
function disconnectChat(userId: string): void {
  try {
    globalThis.__threadsteadChatDisconnectUser?.(userId);
  } catch (error) {
    console.error("Couldn't disconnect chat sockets after moderation:", error);
  }
}

/** Re-tier the account's Indie Index sites now instead of at the next nightly run. */
async function retierIndieSites(userId: string, now: Date): Promise<void> {
  try {
    await recomputeSites(db, await sitesTouchedBy(db, userId), now);
  } catch (error) {
    console.error("Couldn't update Indie Index tiers after moderation:", error);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __threadsteadChatDisconnectUser: ((userId: string) => void) | undefined;
}

/**
 * Suspend, ban or lift. One transaction writes the account's state, the
 * ModerationAction row and (when given) the resolved report; suspend and ban
 * also delete every Session row, then drop open chat sockets. Then the
 * account's Indie Index sites are re-tiered.
 * Throws ApiError for anything the admin should hear about.
 */
export async function moderateUser(
  input: ModerationActionInput,
  { actorId, userId, reportId, now = new Date() }: ModerateUserOptions
): Promise<ModerationResult> {
  const reason = input.reason?.trim() || undefined;
  if (reason && reason.length > MAX_REASON_LENGTH) {
    throw new ApiError(400, `Keep the reason under ${MAX_REASON_LENGTH} characters`);
  }
  if (input.action !== "lift" && !reason) throw new ApiError(400, "Add a short reason");
  if (input.action === "suspend" && !(input.until instanceof Date && input.until > now)) {
    throw new ApiError(400, "Pick an end date in the future");
  }
  if (userId === actorId) throw new ApiError(400, "You can't do that to your own account");

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, primaryHandle: true, ...MODERATION_SELECT },
  });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin") throw new ApiError(400, "Admins can't be suspended or banned");
  if (input.action === "lift" && !isRestricted(target, now)) {
    throw new ApiError(400, "This account isn't suspended or banned");
  }
  if (reportId) await reportFor(reportId, userId);

  const state =
    input.action === "lift"
      ? { moderationStatus: "active" as const, suspendedUntil: null }
      : input.action === "ban"
        ? { moderationStatus: "banned" as const, suspendedUntil: null }
        : { moderationStatus: "suspended" as const, suspendedUntil: input.until };
  const actionType: ModerationActionType = input.action;
  const restricting = input.action !== "lift";

  const [, action] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        ...state,
        moderationReason: reason ?? null,
        moderatedAt: now,
        moderatedById: actorId,
      },
    }),
    db.moderationAction.create({
      data: {
        action: actionType,
        userId,
        userHandle: target.primaryHandle,
        actorId,
        reason: reason ?? null,
        until: state.suspendedUntil,
        reportId: reportId ?? null,
        createdAt: now,
      },
    }),
    ...(restricting ? [db.session.deleteMany({ where: { userId } })] : []),
    ...(reportId
      ? [
          db.userReport.update({
            where: { id: reportId },
            data: { status: "resolved", resolution: resolutionText(input), reviewedBy: actorId, reviewedAt: now },
          }),
        ]
      : []),
  ]);

  if (restricting) disconnectChat(userId);
  // Their Bluesky handle stops (or starts again) answering straight away.
  // Bluesky itself only looks again when they next post after a day.
  invalidateServedDids();
  await retierIndieSites(userId, now);

  return {
    userId,
    handle: target.primaryHandle,
    moderationStatus: state.moderationStatus,
    suspendedUntil: state.suspendedUntil,
    actionId: action.id,
  };
}

/** The account's moderation history, newest first. */
export function getModerationHistory(userId: string, take = 20) {
  return db.moderationAction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      reason: true,
      until: true,
      reportId: true,
      createdAt: true,
      actor: { select: { primaryHandle: true } },
    },
  });
}
