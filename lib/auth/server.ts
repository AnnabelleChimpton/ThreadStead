import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { db } from "../config/database/connection";
import { sendForbiddenAdmin, sendUnauthenticated } from "../api/errors";

export async function getSessionUser(req: NextApiRequest) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/retro_session=([^;]+)/);
  if (!m) return null;
  const [userId, secret] = m[1].split(".");
  if (!userId || !secret) return null;

  const session = await db.session.findFirst({
    where: { userId, secret, expiresAt: { gt: new Date() } },
    include: {
      user: {
        include: { betaKey: true }
      }
    },
  });
  if (!session) return null;
  return session.user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

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
