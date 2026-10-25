import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma, UserRole } from "@prisma/client";
import { db } from "../config/database/connection";
import { sendForbiddenAdmin, sendUnauthenticated } from "../api/errors";
import {
  createCsrfCookie,
  generateCsrfToken,
  getCookieSecureFlag,
  LEGACY_CSRF_COOKIE,
  usesHostPrefixedCookies,
} from "../server/http/csrf";
import {
  assertCanSignIn,
  isRestricted,
  MODERATION_SELECT,
  writesWhileLeaving,
  type ModerationFields,
} from "../domain/users/moderation";

/**
 * Sessions: a `Session` row plus an HttpOnly cookie `<name>=<userId>.<secret>`,
 * named `__Host-retro_session` in production and `retro_session` in dev (see
 * usesHostPrefixedCookies). Everything that creates, reads or clears one goes
 * through this file.
 */
/** The session cookie's name before the `__Host-` prefix, still read in production for one session lifetime. */
export const LEGACY_SESSION_COOKIE = "retro_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function sessionCookieName(): string {
  return usesHostPrefixedCookies() ? `__Host-${LEGACY_SESSION_COOKIE}` : LEGACY_SESSION_COOKIE;
}

/** A cookie value from the request header, or null. Tolerates bad %-escapes. */
export function readCookie(req: Pick<NextApiRequest, "headers">, name: string): string | null {
  const header = req.headers?.cookie || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function sessionCookie(value: string, maxAge: number, name = sessionCookieName()): string {
  return `${name}=${value}; HttpOnly; ${getCookieSecureFlag()}Path=/; Max-Age=${maxAge}; SameSite=Strict`;
}

/** In production, Set-Cookie lines that expire the pre-`__Host-` cookies (none in dev, where the names are the same). */
function expireLegacyCookies(): string[] {
  if (!usesHostPrefixedCookies()) return [];
  return [
    sessionCookie("", 0, LEGACY_SESSION_COOKIE),
    `${LEGACY_CSRF_COOKIE}=; ${getCookieSecureFlag()}Path=/; Max-Age=0; SameSite=Lax`,
  ];
}

/**
 * Start a session for `userId`: stores the Session row and sets the session
 * cookie plus a fresh CSRF cookie (same lifetime) on `res`. Throws
 * AccountRestrictedError (403) for a suspended or banned account; sign-in
 * routes check first so they can answer with the message.
 */
export async function createSession(res: NextApiResponse, userId: string): Promise<void> {
  await assertCanSignIn(userId);
  const secret = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.session.create({ data: { userId, secret, expiresAt } });

  res.setHeader("Set-Cookie", [
    sessionCookie(`${userId}.${secret}`, SESSION_TTL_SECONDS),
    createCsrfCookie(generateCsrfToken(), SESSION_TTL_SECONDS),
    ...expireLegacyCookies(),
  ]);
}

/**
 * The `[userId, secret]` halves of the session cookie, or null. In production
 * a session from before the rename only has the old `retro_session` name, so
 * that's read when there's no `__Host-` one. Drop the fallback a week after
 * the rename ships (sessions last 7 days and aren't extended).
 */
function readSessionCookie(req: Pick<NextApiRequest, "headers">): [string, string] | null {
  let value = readCookie(req, sessionCookieName());
  if (!value && usesHostPrefixedCookies()) value = readCookie(req, LEGACY_SESSION_COOKIE);
  if (!value) return null;
  const [userId, secret] = value.split(".");
  return userId && secret ? [userId, secret] : null;
}

/**
 * Whether the request has a session cookie of either name, valid or not,
 * empty or not: what the anonymous page cache counts as signed in. The same
 * test as nginx's (design/template-audit/perf/CACHE_STEPS.md), so a mistake
 * in one still leaves the other; a stale cookie errs on the side of no cache.
 */
export const SESSION_COOKIE_PRESENT = /(?:^|;)\s*(?:__Host-)?retro_session=/;
export function hasSessionCookie(req: Pick<NextApiRequest, "headers">): boolean {
  return SESSION_COOKIE_PRESENT.test(req.headers?.cookie || "");
}

/**
 * Log out: delete the request's Session row, so a copied cookie stops
 * working too, and expire the session cookie on `res`.
 */
export async function clearSession(req: Pick<NextApiRequest, "headers">, res: NextApiResponse): Promise<void> {
  // cookie first, so the browser is signed out even if the delete fails
  res.setHeader("Set-Cookie", [sessionCookie("", 0), ...expireLegacyCookies()]);
  const cookie = readSessionCookie(req);
  if (cookie) {
    const [userId, secret] = cookie;
    await db.session.deleteMany({ where: { userId, secret } });
  }
}

/**
 * Delete every Session row of `userId` except the one this request is
 * signed in with, e.g. after a password change.
 */
export async function endOtherSessions(req: Pick<NextApiRequest, "headers">, userId: string): Promise<void> {
  const secret = sessionSecret(req);
  await db.session.deleteMany({ where: { userId, ...(secret ? { NOT: { secret } } : {}) } });
}

/** The secret half of the request's session cookie, or null. */
export function sessionSecret(req: Pick<NextApiRequest, "headers">): string | null {
  return readSessionCookie(req)?.[1] ?? null;
}

/** Delete every Session row of `userId`, e.g. when the account is suspended. */
export async function endAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

const DEFAULT_USER_INCLUDE = { betaKey: true } as const;

export type SessionUser = Prisma.UserGetPayload<{ include: typeof DEFAULT_USER_INCLUDE }>;

type SessionRequest = Pick<NextApiRequest, "headers"> & { method?: string };
/** whileLeaving: a resident who is leaving may write here (staying after all). */
type SessionOptions = { whileLeaving?: boolean };

/**
 * The signed-in user, or null when there is no valid, unexpired session, or
 * the account is suspended or banned (its sessions are deleted when that
 * happens; this covers any made in between). By default the full user with `betaKey`; pass `select` to load only some
 * fields.
 *
 * Someone leaving (lib/domain/users/leaving.ts) stays signed in to look
 * around and to stay after all, but they're hidden from everyone else, so a
 * write from them (any method but GET/HEAD/OPTIONS) reads as signed out
 * unless the route says `whileLeaving`. apiHandler and withRateLimit load it
 * with whileLeaving and refuse such a write with AccountHiddenError instead,
 * so they can say why.
 */
export async function getSessionUser(req: SessionRequest, options?: SessionOptions): Promise<SessionUser | null>;
export async function getSessionUser<S extends Prisma.UserSelect>(
  req: SessionRequest,
  options: SessionOptions & { select: S }
): Promise<Prisma.UserGetPayload<{ select: S }> | null>;
export async function getSessionUser(
  req: SessionRequest,
  options?: SessionOptions & { select?: Prisma.UserSelect }
): Promise<unknown> {
  const cookie = readSessionCookie(req);
  if (!cookie) return null;
  const [userId, secret] = cookie;

  // secret is @unique; the userId half of the cookie must still match.
  const session = await db.session.findUnique({
    where: { secret },
    select: {
      userId: true,
      expiresAt: true,
      user: options?.select
        ? { select: { ...options.select, ...MODERATION_SELECT } }
        : { include: DEFAULT_USER_INCLUDE },
    },
  });
  if (!session || session.userId !== userId || session.expiresAt <= new Date()) return null;

  const user = session.user as unknown as ModerationFields & Record<string, unknown>;
  if (isRestricted(user)) return null;
  if (!options?.whileLeaving && writesWhileLeaving(req, user)) return null;
  if (options?.select) {
    // Hand back only what the caller asked for.
    for (const key of Object.keys(MODERATION_SELECT)) {
      if (!(key in options.select)) delete user[key];
    }
  }
  return user;
}

/**
 * The signed-in admin, or null.
 *
 * Pass `res` and it also sends the response for you — 401 when signed out,
 * 403 for a non-admin — so the caller only writes `if (!admin) return;`.
 * New routes should prefer apiHandler({ auth: 'admin' }) from lib/api/handler.
 */
export async function requireAdmin(req: NextApiRequest, res?: NextApiResponse): Promise<SessionUser | null> {
  const user = await getSessionUser(req);
  if (user && user.role === UserRole.admin) return user;

  if (res) {
    if (!user) sendUnauthenticated(res);
    else sendForbiddenAdmin(res);
  }
  return null;
}

export function isAdmin(user: { role: UserRole } | null): boolean {
  return user?.role === UserRole.admin;
}
