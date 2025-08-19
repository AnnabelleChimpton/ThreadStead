import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility } from "@prisma/client";
import { db } from "@/lib/db";

import { getSessionUser } from "@/lib/auth-server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const { title, bodyText, bodyHtml, bodyMarkdown, visibility, threadRingIds } = (req.body || {}) as {
    title?: string;
    bodyText?: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    visibility?: Visibility;
    threadRingIds?: string[]; // THREADRINGS TODO: Array of ThreadRing IDs to associate with post
  };

  if (!bodyText && !bodyHtml && !bodyMarkdown) {
    return res.status(400).json({ error: "bodyText, bodyHtml, or bodyMarkdown required" });
  }

  let safeHtml: string | null = null;
  if (typeof bodyMarkdown === "string") {
    safeHtml = markdownToSafeHtml(bodyMarkdown); // Convert markdown to HTML for preview
  } else if (typeof bodyHtml === "string") {
    safeHtml = cleanAndNormalizeHtml(bodyHtml);
  }

  const vis: Visibility =
    visibility && ["public", "followers", "friends", "private"].includes(visibility)
      ? visibility
      : "public";

  const post = await db.post.create({
    data: {
      authorId: viewer.id,
      title: title ?? null,
      bodyText: bodyText ?? null,
      bodyHtml: safeHtml,
      bodyMarkdown: bodyMarkdown ?? null, // Store raw markdown
      visibility: vis,
      tags: [],
    },
  });

  // THREADRINGS TODO: Associate post with ThreadRings if provided
  // if (threadRingIds && threadRingIds.length > 0) {
  //   // 1. Validate user is member of all specified ThreadRings
  //   // 2. Create PostThreadRing associations
  //   // await db.postThreadRing.createMany({
  //   //   data: threadRingIds.map(ringId => ({
  //   //     postId: post.id,
  //   //     threadRingId: ringId,
  //   //     addedBy: viewer.id
  //   //   }))
  //   // });
  // }

  res.status(201).json({ post });
}

