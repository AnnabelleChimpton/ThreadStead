import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  const exists = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "post not found" });

  const count = await db.comment.count({ where: { postId } });
  return res.json({ count });
}
