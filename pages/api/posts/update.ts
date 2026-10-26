import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma, Visibility } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { PROFILE_WITHOUT_PAGE } from "@/lib/domain/profile/profile-fields";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { buildPostUri, generateTextPreview, generateExcerpt } from "@/lib/domain/posts/ringhub-metadata";
import { withCsrfProtection } from "@/lib/server/http/csrf";
import { withRateLimit } from "@/lib/server/http/rate-limit";
import { queueTellLinkedSites } from "@/lib/webmentions/send";
import { validatePostTitle } from "@/lib/domain/validation";
import { UNTITLED_POST } from "@/lib/domain/posts/title";
import { journalMetadata, updatePostSchema } from "@/lib/domain/posts/request";
import { validationMessage } from "@/lib/api/validation";

type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const parsed = updatePostSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error.issues) });
  const { id, title, bodyText, bodyHtml, bodyMarkdown, visibility, intent, isSpoiler, contentWarning, metadata } = parsed.data;

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
    bodyText?: string | null;
    bodyHtml?: string | null;
    bodyMarkdown?: string | null;
    visibility?: Visibility;
    intent?: PostIntent | null;
    isSpoiler?: boolean;
    contentWarning?: string | null;
    metadata?: any;
  } = {};

  // Handle content updates
  // The same title rules as a new post (edits skipped them: empty, too long, reserved)
  if (typeof title === "string") {
    const titleValidation = validatePostTitle(title || UNTITLED_POST);
    if (!titleValidation.ok) return res.status(400).json({ error: titleValidation.message, code: titleValidation.code });
    data.title = titleValidation.normalized;
  }
  if (typeof bodyText === "string") {
    data.bodyText = bodyText;
    data.bodyHtml = null; // Clear HTML when switching to text
    data.bodyMarkdown = null; // Clear markdown when switching to text
  }
  if (typeof bodyMarkdown === "string") {
    data.bodyMarkdown = bodyMarkdown;
    data.bodyHtml = markdownToSafeHtml(bodyMarkdown);
    data.bodyText = null; // Clear text when switching to markdown
  } else if (typeof bodyHtml === "string") {
    data.bodyHtml = cleanAndNormalizeHtml(bodyHtml);
    data.bodyMarkdown = null; // Clear markdown when switching to HTML
    data.bodyText = null; // Clear text when switching to HTML
  }

  // Handle other field updates
  if (visibility && ["public", "followers", "friends", "private"].includes(visibility)) {
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

  if (metadata !== undefined) {
    // Only the editor's journal fields (lib/domain/posts/request.ts)
    data.metadata = journalMetadata(metadata) ?? Prisma.DbNull;
  }

  // Update the post
  const updated = await db.post.update({
    where: { id },
    data,
    include: {
      author: {
        include: {
          profile: PROFILE_WITHOUT_PAGE
        }
      },
      threadRings: {
        include: {
          threadRing: true
        }
      }
    }
  });

  // ThreadRing associations cannot be updated after post creation
  // They are set during initial post creation and are immutable

  // Propagate the edit to Ring Hub. Re-submitting the same uri as its author
  // updates the PostRef's metadata (the hub's /trp/submit edit path), keyed on
  // the canonical post URI, so we reuse create.ts's buildPostUri and preview
  // helpers to keep the URI and metadata shape the same.
  //
  // Hub metadata is served to anyone, so a post that isn't public sends none
  // of its words: its title, preview and journal fields are blanked, and the
  // PostRef stays in its rings as a bare link (the post page says it's
  // private). Making it public again sends them back. Taking it out of its
  // rings instead would be for good: the hub keeps removed posts out.
  //
  // Best-effort per ring, non-fatal on failure (log, don't 500), mirroring
  // create.ts's submit loop.
  try {
    const threadRingPostIds = (updated.threadRingPostIds as Record<string, string>) || {};
    const ringSlugs = updated.threadRings
      .map((ptr) => ptr.threadRing.slug)
      // Only re-push rings we actually submitted to the hub (have a stored
      // PostRef id keyed by slug). Rings without one were never accepted.
      .filter((slug) => !!threadRingPostIds[slug]);

    if (ringSlugs.length > 0) {
      const authenticatedClient = createAuthenticatedRingHubClient(me.id);

      const uri = buildPostUri(updated.author.primaryHandle, updated.id);
      const digest = `sha256:${updated.id}`;
      const textPreview = generateTextPreview(updated.bodyText, updated.bodyHtml, updated.bodyMarkdown);
      const excerpt = generateExcerpt(updated.bodyText, updated.bodyHtml, updated.bodyMarkdown);

      for (const slug of ringSlugs) {
        try {
          const membership = updated.threadRings.find(
            (ptr) => ptr.threadRing.slug === slug
          )?.threadRing;

          const shared = { platform: "blog", threadRingSlug: slug, threadRingName: membership?.name || slug };
          const metadata = updated.visibility !== "public" ? { ...shared, title: "", textPreview: "", excerpt: "" } : {
            // The journal fields first, and only those, so nothing in them
            // can stand in for the post's own fields below
            ...(journalMetadata(updated.metadata) ?? {}),
            ...shared,
            title: updated.title.length > 200 ? updated.title.substring(0, 197) + "..." : updated.title,
            textPreview,
            excerpt,
            publishedAt: (updated.publishedAt ?? updated.createdAt).toISOString(),
            threadsteadUserId: me.id,
            authorHandle: updated.author.primaryHandle,
            isSpoiler: updated.isSpoiler || false,
            contentWarning: updated.contentWarning || null,
          };

          await authenticatedClient.submitPost(slug, { uri, digest, metadata });
        } catch (ringHubError: any) {
          console.error(`❌ Failed to propagate post update to Ring Hub ring ${slug}:`, {
            postId: id,
            error: ringHubError?.message,
            status: ringHubError?.status,
          });
          // Continue with other rings; hub sync failure must not fail the edit.
        }
      }
    }
  } catch (ringHubError: any) {
    console.error("Failed to propagate post update to Ring Hub:", {
      postId: id,
      error: ringHubError?.message,
    });
    // Non-fatal: the local edit already succeeded.
  }

  // Webmentions when what readers see changed: to the sites it links to now,
  // and to ones the old version linked to if that version was public too
  const sendable = (p: { visibility: string; contentWarning: string | null; isSpoiler: boolean }) =>
    p.visibility === "public" && !p.contentWarning && !p.isSpoiler;
  if (
    updated.bodyHtml !== existingPost.bodyHtml ||
    sendable(updated) !== sendable(existingPost)
  ) {
    queueTellLinkedSites(db, updated.id, {
      authorId: me.id,
      previousHtml: sendable(existingPost) ? existingPost.bodyHtml : null,
    });
  }

  res.json({ post: updated });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('posts')(withCsrfProtection(handler));
