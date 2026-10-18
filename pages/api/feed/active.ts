import type { Prisma } from "@prisma/client";

import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { calculateHotScore } from "@/lib/feed/ranking";
import { apiHandler } from "@/lib/api/handler";
import { parseOffsetPagination } from "@/lib/server/http/pagination";
import { getUserBlockedIds, addBlockFiltersToWhere, countHiddenComments, visibleCommentCount } from "@/lib/domain/users/blocks";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    try {
      const { limit, offset } = parseOffsetPagination(req.query, { defaultLimit: 20, maxLimit: 50 });

      // Algorithm constants

      // Fetch a larger pool of candidates to rank
      // We look for posts that are either recent OR have recent comments
      // Signed-in viewers don't see people or rings they've blocked
      const { blockedUserIds, blockedThreadRingIds } = viewer
        ? await getUserBlockedIds(viewer.id)
        : { blockedUserIds: [], blockedThreadRingIds: [] };
      // ...and a blocked person's comment doesn't count as the latest activity
      const visibleComment: Prisma.CommentWhereInput = {
        status: "visible",
        ...(blockedUserIds.length > 0 ? { authorId: { notIn: blockedUserIds } } : {}),
      };

      const candidates = await db.post.findMany({
        where: addBlockFiltersToWhere({
          visibility: "public",
          OR: [
            { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Posted in last 7 days
            { comments: { some: { createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, ...visibleComment } } } // Commented in last 3 days
          ]
        }, blockedUserIds, blockedThreadRingIds),
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
            where: visibleComment,
            orderBy: {
              createdAt: "desc"
            },
            take: 1, // Get the most recent comment for display
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
          },
          threadRings: {
            include: {
              threadRing: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          }
        },
        take: 500 // Fetch enough candidates to get a good ranking
      });

      // Comments the viewer won't see don't count, for ranking or display
      const hiddenComments = await countHiddenComments(candidates.map(p => p.id), blockedUserIds);

      // Calculate score for each post
      const scoredPosts = candidates.map(post => {
        const commentCount = visibleCommentCount(post.id, post._count.comments, hiddenComments);
        const score = calculateHotScore({
          id: post.id,
          createdAt: post.createdAt,
          commentCount,
          lastCommentAt: post.comments[0]?.createdAt
        });

        return { ...post, commentCount, score };
      });

      // Sort by score descending
      scoredPosts.sort((a, b) => b.score - a.score);

      // Apply pagination
      const paginatedPosts = scoredPosts.slice(offset, offset + limit);

      // Transform posts to include activity info
      const transformedPosts = paginatedPosts.map(post => ({
        id: post.id,
        authorId: post.authorId,
        authorUsername: post.author.handles[0]?.handle || null,
        authorDisplayName: post.author.profile?.displayName || null,
        authorAvatarUrl: post.author.profile?.avatarUrl || null,
        title: post.title,
        intent: post.intent,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        bodyHtml: post.bodyHtml,
        bodyText: post.bodyText,
        bodyMarkdown: post.bodyMarkdown,
        media: post.media,
        tags: post.tags,
        commentCount: post.commentCount,
        lastCommentAt: post.comments[0]?.createdAt || null,
        lastCommenterUsername: post.comments[0]?.author?.handles[0]?.handle || null,
        threadRings: post.threadRings,
        isSpoiler: post.isSpoiler,
        contentWarning: post.contentWarning,
        metadata: post.metadata,
        // Debug info (optional, remove in prod if needed)
        _score: process.env.NODE_ENV === 'development' ? post.score : undefined
      }));

      return res.json({
        posts: transformedPosts,
        hasMore: offset + limit < scoredPosts.length
      });

    } catch (error) {
      console.error("Error fetching active posts:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);