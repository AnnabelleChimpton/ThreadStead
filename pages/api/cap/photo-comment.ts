import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { mintCapability } from "@/lib/domain/users/capabilities";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not logged in" });

  const { photoId } = req.body;
  if (!photoId) return res.status(400).json({ error: "photoId required" });

  const resource = `media:${photoId}/comments`;
  const token = await mintCapability(user.id, ["write:comment"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}