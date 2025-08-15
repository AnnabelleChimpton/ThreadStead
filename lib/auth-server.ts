import type { NextApiRequest } from "next";
import { PrismaClient, UserRole } from "@prisma/client";
const db = new PrismaClient();

export async function getSessionUser(req: NextApiRequest) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/retro_session=([^;]+)/);
  if (!m) return null;
  const [userId, secret] = m[1].split(".");
  if (!userId || !secret) return null;

  const session = await db.session.findFirst({
    where: { userId, secret, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!session) return null;
  return session.user;
}

export async function requireAdmin(req: NextApiRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== UserRole.admin) {
    return null;
  }
  return user;
}

export function isAdmin(user: { role: UserRole } | null): boolean {
  return user?.role === UserRole.admin;
}
