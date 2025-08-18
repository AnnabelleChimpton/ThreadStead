import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { SITE_NAME } from "@/lib/site-config";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));

    const posts = await db.post.findMany({
      where: {
        visibility: "public"
      },
      include: {
        author: {
          include: {
            handles: {
              where: { host: SITE_NAME },
              take: 1
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        comments: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });

    // Transform posts to include username and comment count
    const transformedPosts = posts.map(post => ({
      id: post.id,
      authorId: post.authorId,
      authorUsername: post.author.handles[0]?.handle || null,
      authorDisplayName: post.author.profile?.displayName || null,
      authorAvatarUrl: post.author.profile?.avatarUrl || null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      bodyHtml: post.bodyHtml,
      bodyText: post.bodyText,
      bodyMarkdown: post.bodyMarkdown,
      media: post.media,
      tags: post.tags,
      commentCount: post.comments.length
    }));

    return res.json({ 
      posts: transformedPosts,
      hasMore: posts.length === limit 
    });

  } catch (error) {
    console.error("Error fetching recent posts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}