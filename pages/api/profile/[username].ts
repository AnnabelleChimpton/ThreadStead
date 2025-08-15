import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { SITE_NAME } from "@/lib/site-config";
const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.query.username || "");
  if (!username) return res.status(400).json({ error: "username required" });

  // assuming local host for now
  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: {
      user: {
        include: {
          profile: true,
          installs: true,
        },
      },
    },
  });

  if (!handle) return res.status(404).json({ error: "not found" });

  const u = handle.user;
  return res.json({
    did: u.did,
    userId: u.id,                       // <-- add this
    username,
    primaryHandle: u.primaryHandle ?? null, // optional, handy later
    profile: u.profile,
    plugins: u.installs
      .filter(i => i.enabled)
      .map(i => ({ id: i.pluginId, mode: i.mode, label: undefined })),
  });
}
