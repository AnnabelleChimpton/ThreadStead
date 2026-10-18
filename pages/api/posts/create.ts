import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility, PostIntent } from "@prisma/client";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { validatePostTitle } from "@/lib/domain/validation";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import { buildPostUri, generateTextPreview, generateExcerpt } from "@/lib/domain/posts/ringhub-metadata";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { postToRings, refuseNonPublicPost, NOT_A_MEMBER_REASON, type RingPostResult } from "@/lib/domain/posts/ring-submission";

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
  const finalTitle = title || "Untitled Post";
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

  // Associate post with ThreadRings if provided. Every requested ring gets a
  // result so the composer can say where the post landed and where it didn't.
  let ringResults: RingPostResult[] = [];
  // Rings are public spaces: a non-public post goes to none of them (hub or local).
  const nonPublicRefusal = threadRingIds && threadRingIds.length > 0 ? refuseNonPublicPost(threadRingIds, vis) : null;
  if (nonPublicRefusal) {
    ringResults = nonPublicRefusal;
  } else if (threadRingIds && threadRingIds.length > 0) {
    try {
      if (featureFlags.ringhub()) {
        // Ring Hub integration for post association
        const authenticatedClient = createAuthenticatedRingHubClient(viewer.id);

        // When Ring Hub is enabled, threadRingIds are actually slugs, not database IDs
        const ringSlugs = threadRingIds;

        const baseUrl = getSiteBaseUrl();
        // Unset falls back to http://localhost:3000, so it counts as localhost
        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

        // Prompt details per ring, filled in while building each submission and
        // reused after the hub accepts it.
        const promptDetailsBySlug = new Map<string, any>();

        ringResults = await postToRings(authenticatedClient, ringSlugs, {
          visibility: post.visibility,
          // Dev mode workaround: a prompt response may target a ring the user
          // hasn't joined (all users used to share the server DID in dev).
          skipMembershipCheck: isLocalhost && !!promptId,
          buildSubmission: async ({ slug, name: ringName }) => {
            // Generate Ring Hub metadata following the new schema
            const textPreview = generateTextPreview(post.bodyText, post.bodyHtml, post.bodyMarkdown);
            const excerpt = generateExcerpt(post.bodyText, post.bodyHtml, post.bodyMarkdown);

            // Check if this is a prompt response
            let isPromptResponse = false;
            let promptDetails = null;

            if (promptId) {
              try {
                const { createPromptService } = await import('@/lib/utils/data/prompt-service');
                const promptService = createPromptService(slug);
                promptDetails = await promptService.getPromptDetails(promptId);
                isPromptResponse = !!promptDetails;

                // Dev mode workaround: If prompt not found but we have a promptId, treat as prompt response anyway
                if (!isPromptResponse && isLocalhost) {
                  isPromptResponse = true;
                  // Create minimal prompt details for metadata
                  promptDetails = {
                    prompt: {
                      promptId: promptId!,
                      title: 'Dev Mode Prompt' // Will be overridden if we have the title from URL
                    }
                  } as any;
                }
              } catch (promptError) {

                // Dev mode workaround: On error, still treat as prompt response
                if (isLocalhost) {
                  isPromptResponse = true;
                  promptDetails = {
                    prompt: {
                      promptId: promptId!,
                      title: 'Dev Mode Prompt'
                    }
                  } as any;
                }
              }
            }

            // Prepare metadata based on whether this is a prompt response
            let metadata;

            if (isPromptResponse && promptDetails) {
              promptDetailsBySlug.set(slug, promptDetails);
              // This is a prompt response - use prompt response metadata
              metadata = {
                type: 'prompt_response',
                response: {
                  promptId: promptId,
                  promptTitle: promptDetails.prompt.title,
                  responseType: 'direct',
                  respondedAt: new Date().toISOString(),
                  // Add user identification for dev mode workaround
                  threadsteadUserId: viewer.id
                },
                // Include base post metadata as well
                title: post.title.length > 200 ? post.title.substring(0, 197) + '...' : post.title,
                textPreview: textPreview,
                excerpt: excerpt,
                publishedAt: new Date().toISOString(),
                platform: "blog",
                threadRingSlug: slug,
                threadRingName: ringName,
                // Add user identification for dev mode workaround
                threadsteadUserId: viewer.id,
                authorHandle: postWithAuthor?.author?.primaryHandle,
                // Spoiler content warning information
                isSpoiler: post.isSpoiler || false,
                contentWarning: post.contentWarning || null,
                // Include journal metadata
                ...((post as any).metadata as object || {})
              };
            } else {
              // Regular post metadata
              metadata = {
                title: post.title.length > 200 ? post.title.substring(0, 197) + '...' : post.title,
                textPreview: textPreview,
                excerpt: excerpt,
                publishedAt: new Date().toISOString(),
                platform: "blog",
                threadRingSlug: slug,
                threadRingName: ringName,
                // Add user identification for dev mode workaround
                threadsteadUserId: viewer.id,
                authorHandle: postWithAuthor?.author?.primaryHandle,
                // Spoiler content warning information
                isSpoiler: post.isSpoiler || false,
                contentWarning: post.contentWarning || null,
                // Include journal metadata
                ...((post as any).metadata as object || {})
              };
            }

            return {
              uri: buildPostUri(postWithAuthor?.author?.primaryHandle, post.id),
              digest: `sha256:${post.id}`,
              metadata: metadata
            };
          },
        });

        // Save the local→hub PostRef id map (used to remove the post from rings later)
        const threadRingPostIds: Record<string, string> = {};
        for (const r of ringResults) {
          if (r.hubPostId) threadRingPostIds[r.slug] = r.hubPostId;
        }
        if (Object.keys(threadRingPostIds).length > 0) {
          try {
            await db.post.update({
              where: { id: post.id },
              data: { threadRingPostIds }
            });
          } catch (idMapError) {
            console.error("Failed to save Ring Hub post ids:", idMapError);
          }
        }

        // If this was a prompt response, update the response count
        for (const r of ringResults) {
          const promptDetails = promptDetailsBySlug.get(r.slug);
          if (r.status === 'failed' || !promptDetails) continue;
          try {
            const { createPromptService } = await import('@/lib/utils/data/prompt-service');
            const promptService = createPromptService(r.slug);
            await promptService.associatePostWithPrompt(
              viewer.id,
              buildPostUri(postWithAuthor?.author?.primaryHandle, post.id),
              promptId!,
              promptDetails.prompt.title
            );
          } catch (countError) {
            console.error(`⚠️ Failed to update response count for prompt ${promptId} in ring ${r.slug}:`, countError);
          }
        }

        // Only rings the hub accepted get local associations below —
        // otherwise the UI shows the post in rings it never reached.
        const submittedSlugs = ringResults.filter(r => r.status === 'posted').map(r => r.slug);
        const ringNameBySlug = new Map(ringResults.map(r => [r.slug, r.name]));

        // Create local PostThreadRing associations for feed display
        // even when using Ring Hub (maintains compatibility with existing feed APIs).
        // Only for rings the hub accepted — a failed submission must not show
        // as attached in the UI.
        if (submittedSlugs.length > 0) {
          try {
            // Get existing local ThreadRing records
            const existingLocalRings = await db.threadRing.findMany({
              where: { slug: { in: submittedSlugs } },
              select: { id: true, slug: true, name: true }
            });

            // Create map of existing rings by slug
            const existingRingsMap = new Map(
              existingLocalRings.map(ring => [ring.slug, ring])
            );

            // Create missing local ThreadRing records for RingHub rings
            const missingRingSlugs = submittedSlugs.filter(slug => !existingRingsMap.has(slug));

            for (const slug of missingRingSlugs) {
              try {
                const ringName = ringNameBySlug.get(slug) || slug;

                // Generate a unique URI for the RingHub ThreadRing
                const ringUri = `${getSiteBaseUrl()}/tr/${slug}`;

                const newLocalRing = await db.threadRing.create({
                  data: {
                    uri: ringUri,
                    name: ringName,
                    slug: slug,
                    description: `RingHub ThreadRing: ${ringName}`,
                    visibility: "public",
                    curatorId: viewer.id, // Use current user as curator
                    joinType: "open",
                    postCount: 0,
                    memberCount: 1
                  },
                  select: { id: true, slug: true, name: true }
                });

                existingRingsMap.set(slug, newLocalRing);
              } catch (createError) {
                console.error(`❌ Failed to create local ThreadRing ${slug}:`, createError);
                // Continue with other rings
              }
            }

            // Create PostThreadRing associations for all valid rings (existing + newly created)
            const allLocalRings = Array.from(existingRingsMap.values());
            if (allLocalRings.length > 0) {
              const localRingIds = allLocalRings.map(ring => ring.id);
              // Create associations AND bump postCount for each accepted ring in one
              // transaction, mirroring the local-only branch below (which increments)
              // and keeping counts symmetric with removal's decrement.
              await db.$transaction([
                db.postThreadRing.createMany({
                  data: allLocalRings.map(ring => ({
                    postId: post.id,
                    threadRingId: ring.id,
                    addedBy: viewer.id
                  }))
                }),
                db.threadRing.updateMany({
                  where: { id: { in: localRingIds } },
                  data: { postCount: { increment: 1 } }
                })
              ]);
            }
          } catch (localAssocError) {
            // The hub has the post, so the ring feed shows it; only the local
            // "Posted to" mirror is missing. Don't fail post creation over it.
            console.error("Failed to create local PostThreadRing associations:", localAssocError);
          }
        }
      } else {
        // Original local-only logic. The composer sends slugs (it selects by
        // ring.slug), so match on either id or slug.
        const userMemberships = await db.threadRingMember.findMany({
          where: {
            userId: viewer.id,
            OR: [
              { threadRingId: { in: threadRingIds } },
              { threadRing: { slug: { in: threadRingIds } } }
            ]
          },
          select: { threadRing: { select: { id: true, slug: true, name: true } } }
        });

        const memberRings = userMemberships.map(m => m.threadRing);
        const validRingIds = memberRings.map(r => r.id);

        if (validRingIds.length > 0) {
          // 2. Create PostThreadRing associations
          await db.postThreadRing.createMany({
            data: validRingIds.map(ringId => ({
              postId: post.id,
              threadRingId: ringId,
              addedBy: viewer.id
            }))
          });

          // 3. Update post counts for the ThreadRings
          await db.threadRing.updateMany({
            where: { id: { in: validRingIds } },
            data: { postCount: { increment: 1 } }
          });
        }

        ringResults = Array.from(new Set(threadRingIds)).map(requested => {
          const ring = memberRings.find(r => r.id === requested || r.slug === requested);
          return ring
            ? { slug: ring.slug, name: ring.name, status: 'posted' as const }
            : { slug: requested, name: requested, status: 'failed' as const, reason: NOT_A_MEMBER_REASON };
        });
      }
    } catch (ringError) {
      console.error("ThreadRing association error:", ringError);
      // Don't fail the post itself; report the rings we couldn't finish.
      const reported = new Set(ringResults.map(r => r.slug));
      ringResults = [
        ...ringResults,
        ...Array.from(new Set(threadRingIds))
          .filter(slug => !reported.has(slug))
          .map(slug => ({ slug, name: slug, status: 'failed' as const, reason: "Something went wrong on our end. Try again later." }))
      ];
    }
  }

  // Note: Prompt response logic is now integrated into the main Ring Hub submission loop above

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

