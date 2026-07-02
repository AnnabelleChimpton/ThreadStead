import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

const MAX_POST_IDS = 100;

/**
 * Batch version of /api/comments/count.
 *
 * GET /api/comments/counts?postIds=id1,id2,id3
 * -> { counts: { id1: 3, id2: 0, id3: 12 } }
 *
 * Mirrors the single-count route's access rules exactly: no auth required,
 * only comments with status "visible" are counted, and unknown ids return 0
 * to avoid 404s in UIs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const raw = String(req.query.postIds || "");
  const postIds = Array.from(
    new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );

  if (postIds.length === 0) {
    return res.status(400).json({ error: "postIds required" });
  }
  if (postIds.length > MAX_POST_IDS) {
    return res.status(400).json({ error: `Too many postIds (max ${MAX_POST_IDS})` });
  }

  const grouped = await db.comment.groupBy({
    by: ["postId"],
    where: { postId: { in: postIds }, status: "visible" },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const id of postIds) counts[id] = 0;
  for (const group of grouped) counts[group.postId] = group._count._all;

  return res.json({ counts });
}
