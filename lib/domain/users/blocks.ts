import { db } from "@/lib/config/database/connection";

/**
 * Get all user IDs and ThreadRing IDs that a user has blocked
 */
export async function getUserBlockedIds(userId: string) {
  const blocks = await db.userBlock.findMany({
    where: { blockerId: userId },
    select: {
      blockedUserId: true,
      blockedThreadRingId: true,
    },
  });

  const blockedUserIds = blocks
    .filter(block => block.blockedUserId)
    .map(block => block.blockedUserId!);

  const blockedThreadRingIds = blocks
    .filter(block => block.blockedThreadRingId)
    .map(block => block.blockedThreadRingId!);

  return {
    blockedUserIds,
    blockedThreadRingIds,
  };
}

/**
 * Check if a user has blocked another user
 */
export async function isUserBlocked(blockerId: string, targetUserId: string): Promise<boolean> {
  const block = await db.userBlock.findFirst({
    where: {
      blockerId,
      blockedUserId: targetUserId,
    },
  });

  return !!block;
}

/**
 * Check if a user has blocked a ThreadRing
 */
export async function isThreadRingBlocked(blockerId: string, threadRingId: string): Promise<boolean> {
  const block = await db.userBlock.findFirst({
    where: {
      blockerId,
      blockedThreadRingId: threadRingId,
    },
  });

  return !!block;
}

/**
 * Filter out posts from blocked users and ThreadRings
 */
export function filterBlockedPosts<T extends { 
  authorId?: string; 
  author?: { id: string };
  threadRings?: Array<{ threadRing: { id: string } }>;
}>(
  posts: T[],
  blockedUserIds: string[],
  blockedThreadRingIds: string[]
): T[] {
  return posts.filter(post => {
    // Check if post author is blocked
    const postAuthorId = post.authorId || post.author?.id;
    if (postAuthorId && blockedUserIds.includes(postAuthorId)) {
      return false;
    }

    // Check if any of the post's ThreadRings are blocked
    if (post.threadRings && post.threadRings.length > 0) {
      const hasBlockedRing = post.threadRings.some(tr => 
        blockedThreadRingIds.includes(tr.threadRing.id)
      );
      if (hasBlockedRing) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter out comments from blocked users
 */
export function filterBlockedComments<T extends { 
  authorId?: string; 
  author?: { id: string };
  replies?: T[];
}>(
  comments: T[],
  blockedUserIds: string[]
): T[] {
  return comments.filter(comment => {
    const commentAuthorId = comment.authorId || comment.author?.id;
    if (commentAuthorId && blockedUserIds.includes(commentAuthorId)) {
      return false;
    }

    // Recursively filter replies
    if (comment.replies && comment.replies.length > 0) {
      comment.replies = filterBlockedComments(comment.replies, blockedUserIds);
    }

    return true;
  });
}

/**
 * Add blocked user/ThreadRing filtering to Prisma where clause
 */
export function addBlockFiltersToWhere(
  where: any,
  blockedUserIds: string[],
  blockedThreadRingIds: string[]
) {
  const filters = [];

  // Exclude blocked users
  if (blockedUserIds.length > 0) {
    filters.push({
      authorId: {
        notIn: blockedUserIds,
      },
    });
  }

  // For posts with ThreadRings, exclude blocked ThreadRings
  if (blockedThreadRingIds.length > 0) {
    filters.push({
      threadRings: {
        none: {
          threadRing: {
            id: {
              in: blockedThreadRingIds,
            },
          },
        },
      },
    });
  }

  if (filters.length > 0) {
    return {
      ...where,
      AND: [
        ...(where.AND || []),
        ...filters,
      ],
    };
  }

  return where;
}