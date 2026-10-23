import type { NextApiRequest, NextApiResponse } from "next";
import { capabilityHolder, mintCapability } from "@/lib/domain/users/capabilities";
import { sameOriginProtection } from "@/lib/server/http/same-origin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // cookie-authed and not on apiHandler: refuse cross-origin posts here
  if (!sameOriginProtection(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const user = await capabilityHolder(req, res);
  if (!user) return;

  const resource = `user:${user.id}/posts`;
  const token = await mintCapability(user.id, ["write:post"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}
