import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { mintCapability } from "@/lib/capabilities";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not logged in" });

  const resource = `user:${user.id}/profile`;
  const token = await mintCapability(user.id, ["write:profile"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}
