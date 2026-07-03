import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility } from "@prisma/client";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { buildPostUri, generateTextPreview, generateExcerpt } from "@/lib/domain/posts/ringhub-metadata";
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
    threadRingIds,
    metadata
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
    metadata?: any;
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
  if (typeof title === "string") data.title = title;
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
    data.metadata = metadata;
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

  // ThreadRing associations cannot be updated after post creation
  // They are set during initial post creation and are immutable

  // Propagate the edited content to Ring Hub so hub-driven feeds/discovery show
  // the updated title/preview/excerpt instead of the original snapshot.
  //
  // Ring Hub has NO dedicated post-update/re-curate endpoint: curatePost only
  // does moderation actions (accept/reject/pin/unpin/remove) with no metadata,
  // and there is no PUT for a PostRef. The submit endpoint (/trp/submit) is the
  // only way to push post metadata, and it is keyed on the canonical post URI
  // (which is deterministic per post) — so re-submitting the same uri/digest
  // with fresh metadata refreshes the existing PostRef. We reuse the EXACT
  // buildPostUri/generateTextPreview/generateExcerpt logic create.ts uses so
  // the URI matches and the metadata shape stays consistent.
  //
  // Best-effort per ring, non-fatal on failure (log, don't 500), mirroring
  // create.ts's submit loop.
  if (featureFlags.ringhub()) {
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

            const metadata = {
              title: updated.title.length > 200 ? updated.title.substring(0, 197) + "..." : updated.title,
              textPreview,
              excerpt,
              publishedAt: (updated.publishedAt ?? updated.createdAt).toISOString(),
              platform: "blog",
              threadRingSlug: slug,
              threadRingName: membership?.name || slug,
              threadsteadUserId: me.id,
              authorHandle: updated.author.primaryHandle,
              isSpoiler: updated.isSpoiler || false,
              contentWarning: updated.contentWarning || null,
              // Preserve any journal metadata the post carries.
              ...(((updated as any).metadata as object) || {}),
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
  }

  res.json({ post: updated });
}

// Apply CSRF protection and rate limiting
export default withRateLimit('posts')(withCsrfProtection(handler));
