import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const postId = String(req.query.postId || "");
  if (!postId) return res.status(400).json({ error: "postId required" });

  // Return 0 for unknown ids to avoid 404s in UIs
  const count = await db.comment.count({ where: { postId, status: "visible" } });
  return res.json({ count });
}
