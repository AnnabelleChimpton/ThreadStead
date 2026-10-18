import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma, UserRole } from "@prisma/client";
import { db } from "../config/database/connection";
import { sendForbiddenAdmin, sendUnauthenticated } from "../api/errors";
import { createCsrfCookie, generateCsrfToken, getCookieSecureFlag } from "../server/http/csrf";

/**
 * Sessions: a `Session` row plus an HttpOnly cookie `retro_session=<userId>.<secret>`.
 * Everything that creates, reads or clears one goes through this file.
 */
export const SESSION_COOKIE = "retro_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

function sessionCookie(value: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${value}; HttpOnly; ${getCookieSecureFlag()}Path=/; Max-Age=${maxAge}; SameSite=Strict`;
}

/**
 * Start a session for `userId`: stores the Session row and sets the session
 * cookie plus a fresh CSRF cookie (same lifetime) on `res`.
 */
export async function createSession(res: NextApiResponse, userId: string): Promise<void> {
  const secret = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.session.create({ data: { userId, secret, expiresAt } });

  res.setHeader("Set-Cookie", [
    sessionCookie(`${userId}.${secret}`, SESSION_TTL_SECONDS),
    createCsrfCookie(generateCsrfToken(), SESSION_TTL_SECONDS),
  ]);
}

/** Expire the session cookie. (The Session row is left to expire on its own.) */
export function clearSession(res: NextApiResponse): void {
  res.setHeader("Set-Cookie", sessionCookie("", 0));
}

const DEFAULT_USER_INCLUDE = { betaKey: true } as const;

export type SessionUser = Prisma.UserGetPayload<{ include: typeof DEFAULT_USER_INCLUDE }>;

/**
 * The signed-in user, or null when there is no valid, unexpired session.
 * By default the full user with `betaKey`; pass `select` to load only some
 * fields.
 */
export async function getSessionUser(req: Pick<NextApiRequest, "headers">): Promise<SessionUser | null>;
export async function getSessionUser<S extends Prisma.UserSelect>(
  req: Pick<NextApiRequest, "headers">,
  options: { select: S }
): Promise<Prisma.UserGetPayload<{ select: S }> | null>;
export async function getSessionUser(
  req: Pick<NextApiRequest, "headers">,
  options?: { select: Prisma.UserSelect }
): Promise<unknown> {
  const value = readCookie(req, SESSION_COOKIE);
  if (!value) return null;
  const [userId, secret] = value.split(".");
  if (!userId || !secret) return null;

  // secret is @unique; the userId half of the cookie must still match.
  const session = await db.session.findUnique({
    where: { secret },
    select: {
      userId: true,
      expiresAt: true,
      user: options?.select ? { select: options.select } : { include: DEFAULT_USER_INCLUDE },
    },
  });
  if (!session || session.userId !== userId || session.expiresAt <= new Date()) return null;
  return session.user;
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
