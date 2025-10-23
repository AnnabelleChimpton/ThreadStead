import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // expire the session cookie
  res.setHeader("Set-Cookie", "retro_session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict");
  res.json({ ok: true });
}
