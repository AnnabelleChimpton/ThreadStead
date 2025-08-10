// pages/api/auth/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as ed from "@noble/ed25519";
import { fromBase64Url } from "@/lib/base64";

const db = new PrismaClient();

function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { did, publicKey, signature } = (req.body || {}) as {
    did?: string; publicKey?: string; signature?: string;
  };
  if (!did || !publicKey || !signature) return res.status(400).json({ error: "bad body" });

  const raw = readCookie(req, "retro_nonce");
  if (!raw) return res.status(400).json({ error: "no nonce" });
  const [nonce, expStr] = raw.split(".");
  if (!nonce || !expStr || Date.now() > Number(expStr)) {
    return res.status(400).json({ error: "nonce expired" });
  }

  // ✅ use our base64url decoder
  const ok = await ed.verifyAsync(
    fromBase64Url(signature),
    new TextEncoder().encode(nonce),
    fromBase64Url(publicKey)
  );
  if (!ok) return res.status(401).json({ error: "bad signature" });

  // ...rest unchanged (find/create user, create session cookie)
  let user = await db.user.findUnique({ where: { did } });
  if (!user) {
    user = await db.user.create({ data: { did } });
  }

  const secret = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.session.create({ data: { userId: user.id, secret, expiresAt } });

  res.setHeader(
    "Set-Cookie",
    `retro_session=${user.id}.${secret}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
  );
  res.json({ ok: true, userId: user.id });
}
