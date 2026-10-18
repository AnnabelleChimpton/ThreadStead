import type { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { apiHandler } from "@/lib/api/handler";
import { getUserBlockedIds, addBlockFiltersToWhere } from "@/lib/domain/users/blocks";
import { followingPostsWhere, getFollowGraph } from "@/lib/domain/posts/visibility";

/**
 * Posts from the people the viewer follows, newest first, filtered by the
 * shared visibility rules. Keyset pagination: `cursor` is the `nextCursor`
 * of the previous page (`<createdAt ISO>_<id>`).
 */

function parseCursor(raw: unknown): { createdAt: Date; id: string } | null {
  if (typeof raw !== "string" || !raw) return null;
  const sep = raw.indexOf("_");
  if (sep < 0) return null;
  const createdAt = new Date(raw.slice(0, sep));
  const id = raw.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res, { user }) => {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1), 50);
    const cursor = parseCursor(req.query.cursor);

    const [{ followeeIds, friendIds }, { blockedUserIds, blockedThreadRingIds }] = await Promise.all([
      getFollowGraph(user.id),
      getUserBlockedIds(user.id),
    ]);

    if (followeeIds.length === 0) {
      return res.json({ posts: [], hasMore: false, nextCursor: null, followingCount: 0 });
    }

    let where: Prisma.PostWhereInput = followingPostsWhere(followeeIds, friendIds);
    if (cursor) {
      where = {
        AND: [
          where,
          {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          },
        ],
      };
    }
    where = addBlockFiltersToWhere(where, blockedUserIds, blockedThreadRingIds);

    const rows = await db.post.findMany({
      where,
      include: {
        author: {
          include: {
            handles: { where: { host: SITE_NAME }, take: 1 },
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { comments: { where: { status: "visible" } } } },
        threadRings: {
          include: { threadRing: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return res.json({
      posts: page.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        authorUsername: post.author.handles[0]?.handle || null,
        authorDisplayName: post.author.profile?.displayName || null,
        authorAvatarUrl: post.author.profile?.avatarUrl || null,
        title: post.title,
        intent: post.intent,
        visibility: post.visibility,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt?.toISOString() || post.createdAt.toISOString(),
        bodyHtml: post.bodyHtml,
        bodyText: post.bodyText,
        bodyMarkdown: post.bodyMarkdown,
        media: post.media,
        tags: post.tags,
        commentCount: post._count.comments,
        threadRings: post.threadRings,
        isSpoiler: post.isSpoiler,
        contentWarning: post.contentWarning,
        metadata: post.metadata,
      })),
      hasMore,
      nextCursor: hasMore && last ? `${last.createdAt.toISOString()}_${last.id}` : null,
      followingCount: followeeIds.length,
    });
  }
);
