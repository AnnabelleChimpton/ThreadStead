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

    // Get posts with recent comments, ordered by latest comment activity
    const posts = await db.post.findMany({
      where: {
        visibility: "public",
        comments: {
          some: {
            status: "visible"
          }
        }
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
          where: {
            status: "visible"
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1, // Get the most recent comment for ordering
          include: {
            author: {
              include: {
                handles: {
                  where: { host: SITE_NAME },
                  take: 1
                }
              }
            }
          }
        },
        _count: {
          select: {
            comments: {
              where: {
                status: "visible"
              }
            }
          }
        }
      },
      orderBy: [
        {
          comments: {
            _count: "desc"
          }
        },
        {
          createdAt: "desc"
        }
      ],
      take: limit,
      skip: offset
    });

    // Transform posts to include activity info
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
      commentCount: post._count.comments,
      lastCommentAt: post.comments[0]?.createdAt || null,
      lastCommenterUsername: post.comments[0]?.author?.handles[0]?.handle || null
    }));

    return res.json({ 
      posts: transformedPosts,
      hasMore: posts.length === limit 
    });

  } catch (error) {
    console.error("Error fetching active posts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}