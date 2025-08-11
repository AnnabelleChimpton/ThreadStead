import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Visibility } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const { bodyText, bodyHtml, bodyMarkdown, visibility, cap } = (req.body || {}) as {
    bodyText?: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    visibility?: Visibility;
    cap?: string;
  };

  if (!bodyText && !bodyHtml && !bodyMarkdown) {
    return res.status(400).json({ error: "bodyText, bodyHtml, or bodyMarkdown required" });
  }

    let safeHtml: string | null = null;
    if (typeof bodyMarkdown === "string") {
    safeHtml = markdownToSafeHtml(bodyMarkdown);
    } else if (typeof bodyHtml === "string") {
    safeHtml = cleanAndNormalizeHtml(bodyHtml);
    }
    // bodyText passes through as-is

    const vis: Visibility =
    visibility && ["public","followers","friends","private"].includes(visibility)
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
