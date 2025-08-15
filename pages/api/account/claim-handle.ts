// pages/api/account/claim-handle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";

const db = new PrismaClient();
const HOST = SITE_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not logged in" });

  const { handle } = req.body || {};
  if (typeof handle !== "string" || !/^[a-z0-9\-_.]{3,20}$/.test(handle)) {
    return res.status(400).json({ error: "invalid handle" });
  }

  // Ensure it's free on this host
  const existing = await db.handle.findFirst({ where: { handle, host: HOST } });
  if (existing) return res.status(409).json({ error: "handle taken" });

  // Set primaryHandle and create Handle + starter Profile in a transaction
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { primaryHandle: `${handle}@${HOST}` },
    });

    await tx.handle.create({
      data: {
        userId: user.id,
        handle,
        host: HOST,
        verifiedAt: new Date(),
      },
    });

    // Create profile if missing
    const hasProfile = await tx.profile.findUnique({ where: { userId: user.id } });
    if (!hasProfile) {
      await tx.profile.create({
        data: {
          userId: user.id,
          displayName: handle,
          bio: `Hi, I'm ${handle}! Welcome to my retro page.`,
          avatarUrl: "/assets/default-avatar.gif",
          visibility: "public",
        },
      });
    }

    // Optional: install hello plugin by default
    const hasHello = await tx.pluginInstall.findFirst({
      where: { ownerId: user.id, pluginId: "com.example.hello" },
    });
    if (!hasHello) {
      await tx.pluginInstall.create({
        data: { ownerId: user.id, pluginId: "com.example.hello", mode: "trusted", enabled: true },
      });
    }
  });

  return res.status(201).json({ ok: true });
}
