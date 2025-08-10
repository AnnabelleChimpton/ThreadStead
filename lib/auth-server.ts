import type { NextApiRequest } from "next";
import { PrismaClient } from "@prisma/client";
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
