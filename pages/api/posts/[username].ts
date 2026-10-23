import { db } from "@/lib/config/database/connection";

import { SITE_NAME } from "@/lib/config/site/constants";
import { isUserRestricted } from "@/lib/domain/users/moderation";
import { getUserBlockedIds, addBlockFiltersToWhere, countHiddenComments, visibleCommentCount } from "@/lib/domain/users/blocks";
import { apiHandler } from "@/lib/api/handler";
import { getAllowedVisibilities } from "@/lib/domain/posts/visibility";



export default apiHandler(
  { methods: ['GET', 'HEAD'], auth: 'optional' },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: { user: true },
    });
    if (!handle) return res.status(404).json({ error: "not found" });

    const authorId = handle.user.id;
    // A suspended, banned or leaving account's pages are gone, posts included (for everyone but themselves).
    if (viewer?.id !== authorId && (await isUserRestricted(authorId))) return res.status(404).json({ error: "not found" });

    const allowed = await getAllowedVisibilities(viewer?.id, authorId);

    // Get blocked users/ThreadRings for the viewer (if logged in)
    let blockedUserIds: string[] = [];
    let blockedThreadRingIds: string[] = [];
  
    if (viewer) {
      const blockData = await getUserBlockedIds(viewer.id);
      blockedUserIds = blockData.blockedUserIds;
      blockedThreadRingIds = blockData.blockedThreadRingIds;
    }

    // Say so rather than look like an empty blog
    if (blockedUserIds.includes(authorId)) {
      return res.json({ posts: [], blocked: true });
    }

    // Build the where clause with block filters
    let whereClause: any = { 
      authorId, 
      visibility: { in: allowed } 
    };

    // Apply block filters if viewer is logged in
    if (viewer) {
      whereClause = addBlockFiltersToWhere(whereClause, blockedUserIds, blockedThreadRingIds);
    }

    const posts = await db.post.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: {
          include: {
            handles: {
              where: { host: SITE_NAME },
              take: 1,
              orderBy: { handle: "asc" }
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
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
        },
      },
    });

    const hiddenComments = await countHiddenComments(posts.map(post => post.id), blockedUserIds);

    // Transform posts to include proper author structure for PostItem component
    const transformedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      intent: post.intent,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      bodyHtml: post.bodyHtml,
      bodyText: post.bodyText,
      bodyMarkdown: post.bodyMarkdown,
      media: post.media,
      tags: post.tags,
      visibility: post.visibility,
      isSpoiler: post.isSpoiler,
      contentWarning: post.contentWarning,
      threadRings: post.threadRings,
      // Provide author data in the structure expected by PostItem component
      author: {
        id: post.authorId,
        primaryHandle: post.author.handles[0]?.handle ? `${post.author.handles[0].handle}@${SITE_NAME}` : undefined,
        profile: post.author.profile ? {
          displayName: post.author.profile.displayName || undefined,
          avatarUrl: post.author.profile.avatarUrl || undefined,
        } : undefined,
      },
      // Keep flat fields for backward compatibility with widgets
      authorId: post.authorId,
      authorUsername: post.author.handles[0]?.handle || null,
      authorDisplayName: post.author.profile?.displayName || null,
      authorAvatarUrl: post.author.profile?.avatarUrl || null,
      commentCount: visibleCommentCount(post.id, post._count.comments, hiddenComments),
    }));

    res.json({ posts: transformedPosts });
  }
);
