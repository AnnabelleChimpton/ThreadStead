import { db } from "@/lib/config/database/connection";

import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";
import { parseOffsetPagination } from "@/lib/server/http/pagination";
import { getHiddenIds, addBlockFiltersToWhere, countHiddenComments, visibleCommentCount } from "@/lib/domain/users/blocks";



export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    try {
      const { limit, offset } = parseOffsetPagination(req.query, { defaultLimit: 20, maxLimit: 50 });

      // Nobody sees suspended or banned accounts; signed-in viewers also
      // don't see people or rings they've blocked
      const { blockedUserIds, blockedThreadRingIds } = await getHiddenIds(viewer?.id);

      const posts = await db.post.findMany({
        where: addBlockFiltersToWhere({ visibility: "public" }, blockedUserIds, blockedThreadRingIds),
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
        orderBy: [
          {
            createdAt: "desc"
          },
          {
            id: "asc" // Stable ordering: ensures consistent results across paginated queries
          }
        ],
        take: limit,
        skip: offset
      });

      // Counts leave out comments the viewer won't see
      const hiddenComments = await countHiddenComments(posts.map(p => p.id), blockedUserIds);

      // Transform posts to include username and comment count
      const transformedPosts = posts.map(post => ({
        id: post.id,
        authorId: post.authorId,
        authorUsername: post.author.handles[0]?.handle || null,
        authorDisplayName: post.author.profile?.displayName || null,
        authorAvatarUrl: post.author.profile?.avatarUrl || null,
        title: post.title,
        intent: post.intent,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt?.toISOString() || post.createdAt.toISOString(),
        bodyHtml: post.bodyHtml,
        bodyText: post.bodyText,
        bodyMarkdown: post.bodyMarkdown,
        media: post.media,
        tags: post.tags,
        commentCount: visibleCommentCount(post.id, post._count.comments, hiddenComments),
        threadRings: post.threadRings,
        isSpoiler: post.isSpoiler,
        contentWarning: post.contentWarning,
        metadata: post.metadata
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
);