import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility, PostIntent } from "@prisma/client";
import { db } from "@/lib/db";

import { getSessionUser } from "@/lib/auth-server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";



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
    },
  });

  // Associate post with ThreadRings if provided
  if (threadRingIds && threadRingIds.length > 0) {
    try {
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

  // Include author info for redirect
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

  res.status(201).json({ 
    post: {
      ...post,
      authorUsername: postWithAuthor?.author?.primaryHandle?.split('@')[0],
    }
  });
}

