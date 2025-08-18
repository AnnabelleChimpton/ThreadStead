import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { mintCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return res.status(404).json({ error: "post not found" });

  const resource = `post:${postId}/comments`;
  const token = await mintCapability(viewer.id, ["write:comment"], resource, 10 * 60);
  res.json({ token, resource, expSec: 600 });
}
