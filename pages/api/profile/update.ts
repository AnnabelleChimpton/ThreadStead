import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";
import { cleanCss } from "@/lib/sanitize-css";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const { displayName, bio, avatarUrl, customCSS, cap } = (req.body || {}) as {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    customCSS?: string;
    cap?: string;
  };

  if (!cap) return res.status(401).json({ error: "capability required" });
  const resource = `user:${me.id}/profile`;
  const ok = await requireAction("write:profile", (resStr) => resStr === resource)(cap).catch(() => null);
  if (!ok) return res.status(403).json({ error: "invalid capability" });

  // Basic trims & constraints
  const data: any = {};
  if (typeof displayName === "string") data.displayName = displayName.trim().slice(0, 80);
  if (typeof bio === "string") data.bio = bio.trim().slice(0, 1000);
  if (typeof avatarUrl === "string") data.avatarUrl = avatarUrl.trim().slice(0, 500);
  if (typeof customCSS === "string") data.customCSS = cleanCss(customCSS);

  // Ensure profile exists
  await db.profile.upsert({
    where: { userId: me.id },
    update: data,
    create: { userId: me.id, ...data },
  });

  return res.status(200).json({ ok: true });
}
