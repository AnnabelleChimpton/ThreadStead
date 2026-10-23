import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility, PostIntent } from "@prisma/client";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { validatePostTitle } from "@/lib/domain/validation";
import { generateTextPreview, generateExcerpt } from "@/lib/domain/posts/ringhub-metadata";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import type { RingPostResult } from "@/lib/domain/posts/ring-submission";
import { sendPostToRings } from "@/lib/domain/posts/send-to-rings";
import { queueTellLinkedSites } from "@/lib/webmentions/send";
import { UNTITLED_POST } from "@/lib/domain/posts/title";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const { title, bodyText, bodyHtml, bodyMarkdown, visibility, threadRingIds, intent, promptId, isSpoiler, contentWarning, metadata } = (req.body || {}) as {
    title?: string;
    bodyText?: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    visibility?: Visibility;
    threadRingIds?: string[]; // Array of ThreadRing IDs to associate with post
    intent?: PostIntent;
    promptId?: string; // Optional prompt ID to associate with post
    isSpoiler?: boolean;
    contentWarning?: string;
    metadata?: any;
  };


  if (!bodyText && !bodyHtml && !bodyMarkdown) {
    return res.status(400).json({ error: "bodyText, bodyHtml, or bodyMarkdown required" });
  }

  // Validate post title if provided
  const finalTitle = title || UNTITLED_POST;
  const titleValidation = validatePostTitle(finalTitle);
  if (!titleValidation.ok) {
    return res.status(400).json({
      error: titleValidation.message,
      code: titleValidation.code
    });
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

  // Generate Ring Hub metadata fields for consistency
  const textPreview = generateTextPreview(bodyText, safeHtml, bodyMarkdown);
  const excerpt = generateExcerpt(bodyText, safeHtml, bodyMarkdown);
  const publishedAt = new Date(); // Use current time as published time

  const post = await db.post.create({
    data: {
      authorId: viewer.id,
      title: titleValidation.normalized, // Use validated title
      intent: intent ?? null,
      bodyText: bodyText ?? null,
      bodyHtml: safeHtml,
      bodyMarkdown: bodyMarkdown ?? null, // Store raw markdown
      visibility: vis,
      tags: [],

      // Spoiler/Content Warning fields
      isSpoiler: isSpoiler ?? false,
      contentWarning: contentWarning ?? null,
      metadata: metadata ?? undefined,

      // Ring Hub metadata alignment
      textPreview: textPreview,
      excerpt: excerpt,
      publishedAt: publishedAt,
      platform: "blog", // ThreadStead posts are blog-style
    },
  });

  // Get author info for post URI generation
  const postWithAuthor = await db.post.findUnique({
    where: { id: post.id },
    include: {
      author: {
        select: {
          primaryHandle: true,
        },
      },
    },
  });

  // Send the post to the requested rings. Every requested ring gets a result
  // so the composer can say where the post landed and where it didn't.
  const ringResults: RingPostResult[] = await sendPostToRings({
    post,
    authorHandle: postWithAuthor?.author?.primaryHandle,
    userId: viewer.id,
    ringSlugs: Array.isArray(threadRingIds) ? threadRingIds : [],
    promptId,
  });

  // Webmentions to the sites it links to, in the background (public posts only)
  queueTellLinkedSites(db, post.id, { authorId: viewer.id });

  // 201 because the post exists; `rings` says where it landed. A ring with
  // status 'failed' did NOT get the post, and `reason` says why.
  res.status(201).json({
    post: {
      ...post,
      authorUsername: postWithAuthor?.author?.primaryHandle?.split('@')[0],
    },
    rings: ringResults,
  });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('posts')(withCsrfProtection(handler));

