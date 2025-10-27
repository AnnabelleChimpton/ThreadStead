import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility } from "@prisma/client";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const {
    id,
    title,
    bodyText,
    bodyHtml,
    bodyMarkdown,
    visibility,
    intent,
    isSpoiler,
    contentWarning,
    threadRingIds
  } = (req.body || {}) as {
    id?: string;
    title?: string;
    bodyText?: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    visibility?: Visibility;
    intent?: PostIntent;
    isSpoiler?: boolean;
    contentWarning?: string;
    threadRingIds?: string[];
  };

  if (!id) {
    return res.status(400).json({ error: "Post ID is required" });
  }

  // First, verify that the user owns this post
  const existingPost = await db.post.findUnique({
    where: { id },
    include: { author: true }
  });

  if (!existingPost) {
    return res.status(404).json({ error: "Post not found" });
  }

  if (existingPost.authorId !== me.id) {
    return res.status(403).json({ error: "You can only edit your own posts" });
  }

  const data: {
    title?: string;
    bodyText?: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    visibility?: Visibility;
    intent?: PostIntent | null;
    isSpoiler?: boolean;
    contentWarning?: string | null;
  } = {};

  // Handle content updates
  if (typeof title === "string") data.title = title;
  if (typeof bodyText === "string") {
    data.bodyText = bodyText;
    data.bodyHtml = undefined; // Clear HTML when switching to text
    data.bodyMarkdown = undefined; // Clear markdown when switching to text
  }
  if (typeof bodyMarkdown === "string") {
    data.bodyMarkdown = bodyMarkdown;
    data.bodyHtml = markdownToSafeHtml(bodyMarkdown);
    data.bodyText = undefined; // Clear text when switching to markdown
  } else if (typeof bodyHtml === "string") {
    data.bodyHtml = cleanAndNormalizeHtml(bodyHtml);
    data.bodyMarkdown = undefined; // Clear markdown when switching to HTML
    data.bodyText = undefined; // Clear text when switching to HTML
  }

  // Handle other field updates
  if (visibility && ["public","followers","friends","private"].includes(visibility)) {
    data.visibility = visibility as Visibility;
  }

  if (intent !== undefined) {
    data.intent = intent || null;
  }

  if (typeof isSpoiler === "boolean") {
    data.isSpoiler = isSpoiler;
    if (!isSpoiler) {
      data.contentWarning = null; // Clear warning if not a spoiler
    }
  }

  if (typeof contentWarning === "string") {
    data.contentWarning = contentWarning.trim() || null;
  }

  // Update the post
  const updated = await db.post.update({
    where: { id },
    data,
    include: {
      author: {
        include: {
          profile: true
        }
      },
      threadRings: {
        include: {
          threadRing: true
        }
      }
    }
  });

  // Handle ThreadRing associations if provided
  if (Array.isArray(threadRingIds)) {
    // Remove existing associations
    await db.postThreadRing.deleteMany({
      where: { postId: id }
    });

    // Add new associations
    if (threadRingIds.length > 0) {
      // First, get the ThreadRing IDs from slugs
      const threadRings = await db.threadRing.findMany({
        where: {
          slug: { in: threadRingIds }
        }
      });

      const threadRingIdMap = threadRings.reduce((acc, tr) => {
        acc[tr.slug] = tr.id;
        return acc;
      }, {} as Record<string, string>);

      // Create new associations
      const associations = threadRingIds
        .filter(slug => threadRingIdMap[slug])
        .map(slug => ({
          postId: id,
          threadRingId: threadRingIdMap[slug],
          addedBy: me.id
        }));

      if (associations.length > 0) {
        await db.postThreadRing.createMany({
          data: associations
        });
      }
    }

    // Fetch the updated post with new associations
    const finalPost = await db.post.findUnique({
      where: { id },
      include: {
        author: {
          include: {
            profile: true
          }
        },
        threadRings: {
          include: {
            threadRing: true
          }
        }
      }
    });

    return res.json({ post: finalPost });
  }

  res.json({ post: updated });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('posts')(withCsrfProtection(handler));
