import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + 60_000; // 60s
  res.setHeader(
    "Set-Cookie",
    `retro_nonce=${nonce}.${expiresAt}; HttpOnly; Secure; Path=/; Max-Age=60; SameSite=Strict`
  );
  res.json({ nonce, expiresAt });
}
