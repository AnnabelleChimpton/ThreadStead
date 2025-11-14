import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getUserBlockedIds, addBlockFiltersToWhere } from "@/lib/domain/users/blocks";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.query.username || "");
  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: true },
  });
  if (!handle) return res.status(404).json({ error: "not found" });

  const viewer = await getSessionUser(req); // may be null
  const authorId = handle.user.id;

  // default: public only
  let allowed = new Set(["public"]);

  if (viewer?.id === authorId) {
    // author sees everything
    allowed = new Set(["public", "followers", "friends", "private"]);
  } else if (viewer) {
    // check relationships
    const [viewerFollowsAuthor, authorFollowsViewer] = await Promise.all([
      db.follow.findUnique({
        where: { followerId_followeeId: { followerId: viewer.id, followeeId: authorId } },
      }),
      db.follow.findUnique({
        where: { followerId_followeeId: { followerId: authorId, followeeId: viewer.id } },
      }),
    ]);

    const isFollower = viewerFollowsAuthor?.status === "accepted";
    const isFriend = isFollower && authorFollowsViewer?.status === "accepted";

    if (isFollower) allowed.add("followers");
    if (isFriend) allowed.add("friends");
  }

  // Get blocked users/ThreadRings for the viewer (if logged in)
  let blockedUserIds: string[] = [];
  let blockedThreadRingIds: string[] = [];
  
  if (viewer) {
    const blockData = await getUserBlockedIds(viewer.id);
    blockedUserIds = blockData.blockedUserIds;
    blockedThreadRingIds = blockData.blockedThreadRingIds;
  }

  // Build the where clause with block filters
  let whereClause: any = { 
    authorId, 
    visibility: { in: Array.from(allowed) as any } 
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
      comments: {
        select: {
          id: true
        },
        where: {
          status: "visible"
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
    commentCount: post.comments.length,
  }));

  res.json({ posts: transformedPosts });
}
