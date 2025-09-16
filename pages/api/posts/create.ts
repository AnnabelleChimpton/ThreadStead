import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility, PostIntent } from "@prisma/client";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { validatePostTitle } from "@/lib/domain/validation";

/**
 * Generate a text preview from post content (max 300 chars for Ring Hub)
 */
function generateTextPreview(bodyText?: string | null, bodyHtml?: string | null, bodyMarkdown?: string | null): string {
  // Get plain text content
  let content = '';
  
  if (bodyText) {
    content = bodyText;
  } else if (bodyHtml) {
    // Strip HTML tags to get plain text
    content = bodyHtml.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  } else if (bodyMarkdown) {
    // Strip markdown formatting to get plain text
    content = bodyMarkdown
      .replace(/[#*`_~]/g, '') // Remove markdown symbols
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1'); // Convert images to alt text
  }
  
  // Clean up whitespace and decode URL-encoded characters for Ring Hub compatibility
  content = content.replace(/\s+/g, ' ').trim();

  // Decode URL-encoded characters to prevent Ring Hub validation errors
  try {
    content = decodeURIComponent(content);
  } catch (error) {
    // If decoding fails, sanitize problematic characters instead
    content = content.replace(/%[0-9A-Fa-f]{2}/g, '');
  }
  
  if (content.length <= 300) {
    return content;
  }
  
  // Truncate at word boundary
  const truncated = content.substring(0, 300);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 250 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Generate an excerpt from post content (max 500 chars for Ring Hub)
 */
function generateExcerpt(bodyText?: string | null, bodyHtml?: string | null, bodyMarkdown?: string | null): string {
  // Get plain text content (same logic as preview but longer)
  let content = '';
  
  if (bodyText) {
    content = bodyText;
  } else if (bodyHtml) {
    content = bodyHtml.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  } else if (bodyMarkdown) {
    content = bodyMarkdown
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  }
  
  content = content.replace(/\s+/g, ' ').trim();

  // Decode URL-encoded characters to prevent Ring Hub validation errors
  try {
    content = decodeURIComponent(content);
  } catch (error) {
    // If decoding fails, sanitize problematic characters instead
    content = content.replace(/%[0-9A-Fa-f]{2}/g, '');
  }

  if (content.length <= 500) {
    return content;
  }
  
  // Truncate at word boundary
  const truncated = content.substring(0, 500);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 450 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const { title, bodyText, bodyHtml, bodyMarkdown, visibility, threadRingIds, intent, promptId, isSpoiler, contentWarning } = (req.body || {}) as {
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

  // Associate post with ThreadRings if provided
  if (threadRingIds && threadRingIds.length > 0) {
    try {
      if (featureFlags.ringhub()) {
        // Ring Hub integration for post association
        const authenticatedClient = createAuthenticatedRingHubClient(viewer.id);
        
        // When Ring Hub is enabled, threadRingIds are actually slugs, not database IDs
        const ringSlugs = threadRingIds;
        
        // Validate user membership by fetching from Ring Hub
        const userMemberships = await authenticatedClient.getMyMemberships({
          status: 'ACTIVE'
        });
        
        // Dev mode workaround: If responding to a prompt and no memberships found, 
        // assume the user can post (since all users share the server DID in dev)
        let validSlugs: string[];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const isLocalhost = baseUrl?.includes('localhost') || 
                           baseUrl?.includes('127.0.0.1') ||
                           !baseUrl ||
                           baseUrl?.includes('localhost:3000') ||
                           baseUrl?.includes('localhost:3001');
        
        // Normal validation: Filter to only rings the user is actually a member of
        validSlugs = ringSlugs.filter(slug => 
          userMemberships.memberships.some(membership => 
            membership.ringSlug === slug && membership.status === 'ACTIVE'
          )
        );
        
        // Dev mode workaround: If responding to a prompt but not a member of the ring,
        // allow submission anyway (since all users share the server DID in dev)
        if (isLocalhost && promptId && validSlugs.length === 0 && ringSlugs.length > 0) {
          validSlugs = ringSlugs; // Allow all requested rings in dev mode for prompt responses
        }
        
        // Submit post to each Ring Hub ring using the correct Ring Hub API format
        for (const slug of validSlugs) {
          try {
            // Find the ring membership data to get the name
            const membership = userMemberships.memberships.find(m => m.ringSlug === slug);
            
            // Generate Ring Hub metadata following the new schema
            const textPreview = generateTextPreview(post.bodyText, post.bodyHtml, post.bodyMarkdown);
            const excerpt = generateExcerpt(post.bodyText, post.bodyHtml, post.bodyMarkdown);
            
            // Check if this is a prompt response
            let isPromptResponse = false;
            let promptDetails = null;
            
            if (promptId) {
              console.log(`🎯 Checking if post is response to prompt ${promptId} in ring ${slug}`);
              try {
                const { createPromptService } = await import('@/lib/utils/data/prompt-service');
                const promptService = createPromptService(slug);
                promptDetails = await promptService.getPromptDetails(promptId);
                isPromptResponse = !!promptDetails;
                console.log(`${isPromptResponse ? '✅' : '❌'} Prompt ${promptId} ${isPromptResponse ? 'found' : 'not found'} in ring ${slug}`);
                
                // Dev mode workaround: If prompt not found but we have a promptId, treat as prompt response anyway
                if (!isPromptResponse && isLocalhost) {
                  console.log(`⚠️ Dev mode: Prompt not found in Ring Hub, but treating as prompt response anyway`);
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
                console.log(`⚠️ Error checking prompt ${promptId} in ring ${slug}:`, promptError);
                
                // Dev mode workaround: On error, still treat as prompt response
                if (isLocalhost) {
                  console.log(`⚠️ Dev mode: Error checking prompt, treating as response anyway`);
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
              // This is a prompt response - use prompt response metadata
              console.log(`📝 Creating prompt response PostRef for prompt: ${promptDetails.prompt.title}`);
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
                threadRingName: membership?.ringName || slug,
                // Add user identification for dev mode workaround
                threadsteadUserId: viewer.id,
                authorHandle: postWithAuthor?.author?.primaryHandle,
                // Spoiler content warning information
                isSpoiler: post.isSpoiler || false,
                contentWarning: post.contentWarning || null
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
                threadRingName: membership?.ringName || slug,
                // Add user identification for dev mode workaround
                threadsteadUserId: viewer.id,
                authorHandle: postWithAuthor?.author?.primaryHandle,
                // Spoiler content warning information
                isSpoiler: post.isSpoiler || false,
                contentWarning: post.contentWarning || null
              };
            }
            
            // Create the post submission with the appropriate metadata
            const postSubmission = {
              uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/resident/${postWithAuthor?.author?.primaryHandle?.split('@')[0]}/post/${post.id}`,
              digest: `sha256:${post.id}`,
              metadata: metadata
            };
            
            console.log(`📤 Submitting post to Ring Hub ring: ${slug} (isPromptResponse: ${isPromptResponse})`, postSubmission);
            const result = await authenticatedClient.submitPost(slug, postSubmission);
            console.log(`✅ Post ${post.id} successfully submitted to Ring Hub ring: ${slug}`, result);
            
            // Store the ThreadRing database UUID from the response
            if (result.id) {
              const currentThreadRingPostIds = post.threadRingPostIds as Record<string, string> || {};
              currentThreadRingPostIds[slug] = result.id;
              
              // Update the post with the ThreadRing post ID
              await db.post.update({
                where: { id: post.id },
                data: { threadRingPostIds: currentThreadRingPostIds }
              });
              
              console.log(`💾 Stored ThreadRing post ID ${result.id} for ring ${slug}`);
            }
            
            // If this was a prompt response, update the response count
            if (isPromptResponse && promptDetails) {
              try {
                const { createPromptService } = await import('@/lib/utils/data/prompt-service');
                const promptService = createPromptService(slug);
                await promptService.associatePostWithPrompt(
                  viewer.id,
                  postSubmission.uri,
                  promptId!,
                  promptDetails.prompt.title
                );
                console.log(`✅ Updated response count for prompt ${promptId} in ring ${slug}`);
              } catch (countError) {
                console.error(`⚠️ Failed to update response count for prompt ${promptId} in ring ${slug}:`, countError);
              }
            }
            
          } catch (ringHubError) {
            console.error(`❌ Failed to submit post to Ring Hub ring ${slug}:`, ringHubError);
            // Continue with other rings
          }
        }
        
        // Create local PostThreadRing associations for feed display
        // even when using Ring Hub (maintains compatibility with existing feed APIs)
        if (validSlugs.length > 0) {
          try {
            // Get existing local ThreadRing records
            const existingLocalRings = await db.threadRing.findMany({
              where: { slug: { in: validSlugs } },
              select: { id: true, slug: true, name: true }
            });
            
            // Create map of existing rings by slug
            const existingRingsMap = new Map(
              existingLocalRings.map(ring => [ring.slug, ring])
            );
            
            // Create missing local ThreadRing records for RingHub rings
            const missingRingSlugs = validSlugs.filter(slug => !existingRingsMap.has(slug));
            
            for (const slug of missingRingSlugs) {
              try {
                // Find the membership data to get the ring name
                const membership = userMemberships.memberships.find(m => m.ringSlug === slug);
                const ringName = membership?.ringName || slug;
                
                // Generate a unique URI for the RingHub ThreadRing
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
                const ringUri = `${baseUrl}/tr/${slug}`;
                
                console.log(`🔧 Creating missing local ThreadRing record for RingHub ring: ${slug}`);
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
                console.log(`✅ Created local ThreadRing record for ${slug}`);
              } catch (createError) {
                console.error(`❌ Failed to create local ThreadRing ${slug}:`, createError);
                // Continue with other rings
              }
            }
            
            // Create PostThreadRing associations for all valid rings (existing + newly created)
            const allLocalRings = Array.from(existingRingsMap.values());
            if (allLocalRings.length > 0) {
              await db.postThreadRing.createMany({
                data: allLocalRings.map(ring => ({
                  postId: post.id,
                  threadRingId: ring.id,
                  addedBy: viewer.id
                }))
              });
              console.log(`✅ Created local PostThreadRing associations for ${allLocalRings.length} rings`);
            }
          } catch (localAssocError) {
            console.error("Failed to create local PostThreadRing associations:", localAssocError);
            // Don't fail post creation if this fails
          }
        }
      } else {
        console.log('🏠 Using local database for ThreadRing associations');
        // Original local-only logic
        // 1. Validate user is member of all specified ThreadRings
        const userMemberships = await db.threadRingMember.findMany({
          where: {
            userId: viewer.id,
            threadRingId: { in: threadRingIds }
          },
          select: { threadRingId: true }
        });

        const validRingIds = userMemberships.map(m => m.threadRingId);
        
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
      }
    } catch (ringError) {
      console.error("ThreadRing association error:", ringError);
      // Don't fail the entire post creation if ThreadRing association fails
    }
  }

  // Note: Prompt response logic is now integrated into the main Ring Hub submission loop above

  res.status(201).json({ 
    post: {
      ...post,
      authorUsername: postWithAuthor?.author?.primaryHandle?.split('@')[0],
    }
  });
}

