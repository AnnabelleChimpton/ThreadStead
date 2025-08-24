import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility, PostIntent } from "@prisma/client";
import { db } from "@/lib/db";

import { getSessionUser } from "@/lib/auth-server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";
import { featureFlags } from "@/lib/feature-flags";
import { createAuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

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
  
  // Clean up whitespace and truncate
  content = content.replace(/\s+/g, ' ').trim();
  
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

  const { title, bodyText, bodyHtml, bodyMarkdown, visibility, threadRingIds, intent, promptId } = (req.body || {}) as {
    title?: string;
    bodyText?: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    visibility?: Visibility;
    threadRingIds?: string[]; // Array of ThreadRing IDs to associate with post
    intent?: PostIntent;
    promptId?: string; // Optional prompt ID to associate with post
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

  // Generate Ring Hub metadata fields for consistency
  const textPreview = generateTextPreview(bodyText, safeHtml, bodyMarkdown);
  const excerpt = generateExcerpt(bodyText, safeHtml, bodyMarkdown);
  const publishedAt = new Date(); // Use current time as published time

  const post = await db.post.create({
    data: {
      authorId: viewer.id,
      title: title || "Untitled Post", // Title is now required
      intent: intent ?? null,
      bodyText: bodyText ?? null,
      bodyHtml: safeHtml,
      bodyMarkdown: bodyMarkdown ?? null, // Store raw markdown
      visibility: vis,
      tags: [],
      
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
    console.log('🔗 Processing ThreadRing associations for post:', post.id, 'rings:', threadRingIds);
    try {
      if (featureFlags.ringhub()) {
        console.log('🌐 Using Ring Hub for ThreadRing associations');
        // Ring Hub integration for post association
        const authenticatedClient = createAuthenticatedRingHubClient(viewer.id);
        
        // When Ring Hub is enabled, threadRingIds are actually slugs, not database IDs
        const ringSlugs = threadRingIds;
        
        // Validate user membership by fetching from Ring Hub
        console.log('📋 Fetching user memberships from Ring Hub...');
        const userMemberships = await authenticatedClient.getMyMemberships({
          status: 'ACTIVE'
        });
        console.log('📋 Retrieved memberships:', userMemberships.memberships?.length || 0, 'rings');
        
        // Filter to only rings the user is actually a member of
        const validSlugs = ringSlugs.filter(slug => 
          userMemberships.memberships.some(membership => 
            membership.ringSlug === slug && membership.status === 'ACTIVE'
          )
        );
        console.log('✅ Valid rings for submission:', validSlugs);
        
        // Submit post to each Ring Hub ring using the correct Ring Hub API format
        for (const slug of validSlugs) {
          try {
            // Find the ring membership data to get the name
            const membership = userMemberships.memberships.find(m => m.ringSlug === slug);
            
            // Generate Ring Hub metadata following the new schema
            const textPreview = generateTextPreview(post.bodyText, post.bodyHtml, post.bodyMarkdown);
            const excerpt = generateExcerpt(post.bodyText, post.bodyHtml, post.bodyMarkdown);
            
            const postSubmission = {
              uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/resident/${postWithAuthor?.author?.primaryHandle?.split('@')[0]}/post/${post.id}`,
              digest: `sha256:${post.id}`, // Use proper digest format as per Ring Hub spec
              metadata: {
                title: post.title.length > 200 ? post.title.substring(0, 197) + '...' : post.title, // Max 200 chars
                textPreview: textPreview, // Max 300 chars (handled by function)
                excerpt: excerpt, // Max 500 chars (handled by function)
                publishedAt: new Date().toISOString(), // ISO datetime
                platform: "blog", // ThreadStead posts are blog-style
                // Note: Not including tags for now as requested
                threadRingSlug: slug, // Keep for backward compatibility
                threadRingName: membership?.ringName || slug // Keep for backward compatibility
              }
            };
            
            console.log(`📤 Submitting post to Ring Hub ring: ${slug}`, postSubmission);
            const result = await authenticatedClient.submitPost(slug, postSubmission);
            console.log(`✅ Post ${post.id} successfully submitted to Ring Hub ring: ${slug}`, result);
          } catch (ringHubError) {
            console.error(`❌ Failed to submit post to Ring Hub ring ${slug}:`, ringHubError);
            // Continue with other rings
          }
        }
        
        // Note: When Ring Hub is enabled, we don't create local PostThreadRing associations
        // since the authoritative data is in Ring Hub
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

  // Associate post with prompt if provided
  if (promptId) {
    try {
      // Verify the prompt exists and is active
      const prompt = await db.threadRingPrompt.findFirst({
        where: {
          id: promptId,
          isActive: true
        },
        include: {
          threadRing: {
            select: {
              id: true
            }
          }
        }
      });

      if (prompt) {
        // Verify user is member of the ThreadRing that owns this prompt
        const isMember = await db.threadRingMember.findFirst({
          where: {
            userId: viewer.id,
            threadRingId: prompt.threadRing.id
          }
        });

        if (isMember) {
          // Create the prompt response association
          await db.postThreadRingPrompt.create({
            data: {
              postId: post.id,
              promptId: prompt.id
            }
          });

          // Update response count on the prompt
          await db.threadRingPrompt.update({
            where: { id: prompt.id },
            data: {
              responseCount: {
                increment: 1
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error associating post with prompt:', error);
      // Continue without failing the post creation
    }
  }

  res.status(201).json({ 
    post: {
      ...post,
      authorUsername: postWithAuthor?.author?.primaryHandle?.split('@')[0],
    }
  });
}

