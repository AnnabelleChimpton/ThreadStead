import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Visibility } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";
import { cleanHtml } from "@/lib/sanitize";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const { bodyText, bodyHtml, visibility, cap } = (req.body || {}) as {
    bodyText?: string;
    bodyHtml?: string;
    visibility?: Visibility;
    cap?: string;
  };

  if (!cap) return res.status(401).json({ error: "capability required" });
  const resource = `user:${viewer.id}/posts`;
  const ok = await requireAction("write:post", (resStr) => resStr === resource)(cap).catch(() => null);
  if (!ok) return res.status(403).json({ error: "invalid capability" });

  if (!bodyText && !bodyHtml) return res.status(400).json({ error: "bodyText or bodyHtml required" });

  const safeHtml = bodyHtml ? cleanHtml(bodyHtml) : null;
  const vis: Visibility = visibility && ["public","followers","friends","private"].includes(visibility)
    ? visibility
    : "public";

  const post = await db.post.create({
    data: {
      authorId: viewer.id,
      bodyText: bodyText ?? null,
      bodyHtml: safeHtml,
      visibility: vis,
      tags: [],
    },
  });

  res.status(201).json({ post });
}
