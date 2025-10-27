import type { NextApiRequest, NextApiResponse } from "next";
import { getCookieSecureFlag } from "@/lib/middleware/csrf";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // expire the session cookie
  res.setHeader("Set-Cookie", `retro_session=; HttpOnly; ${getCookieSecureFlag()}Path=/; Max-Age=0; SameSite=Strict`);
  res.json({ ok: true });
}
