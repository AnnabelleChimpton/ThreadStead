import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.query.username || "");
  const handle = await db.handle.findFirst({
    where: { handle: username, host: "local" },
    include: { user: true },
  });
  if (!handle) return res.status(404).json({ error: "not found" });

  const posts = await db.post.findMany({
    where: { authorId: handle.user.id, visibility: "public" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return res.json({ posts });
}
