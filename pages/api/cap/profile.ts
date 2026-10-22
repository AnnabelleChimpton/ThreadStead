import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { mintCapability } from "@/lib/domain/users/capabilities";
import { sameOriginProtection } from "@/lib/server/http/same-origin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // cookie-authed and not on apiHandler: refuse cross-origin posts here
  if (!sameOriginProtection(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not logged in" });

  const resource = `user:${user.id}/profile`;
  const token = await mintCapability(user.id, ["write:profile"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}
