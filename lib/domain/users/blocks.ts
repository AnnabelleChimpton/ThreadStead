import { db } from "@/lib/config/database/connection";
import { extractPostIdFromUri, isOurThreadSteadInstance } from "@/lib/domain/threadrings/orphan-postrefs";

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
 * Filter out comments from blocked users, along with the replies under them
 * (a reply to a hidden comment has nothing left to answer). Handles flat
 * lists linked by `parentId` and nested `replies` arrays. Doesn't mutate.
 */
type BlockFilterableComment = {
  id?: string;
  authorId?: string | null;
  author?: { id?: string | null } | null;
  parentId?: string | null;
  replies?: BlockFilterableComment[];
};

export function filterBlockedComments<T extends BlockFilterableComment>(
  comments: T[],
  blockedUserIds: string[]
): T[] {
  if (blockedUserIds.length === 0) return comments;
  const blocked = new Set(blockedUserIds);
  const isBlockedAuthor = (comment: T) => {
    const authorId = comment.authorId || comment.author?.id;
    return !!authorId && blocked.has(authorId);
  };

  const removed = new Set<string>();
  for (const comment of comments) {
    if (comment.id && isBlockedAuthor(comment)) removed.add(comment.id);
  }
  // Replies can appear before their parent in the list, so repeat until stable
  let grew = removed.size > 0;
  while (grew) {
    grew = false;
    for (const comment of comments) {
      if (comment.id && !removed.has(comment.id) && comment.parentId && removed.has(comment.parentId)) {
        removed.add(comment.id);
        grew = true;
      }
    }
  }

  return comments
    .filter(comment => !isBlockedAuthor(comment) && !(comment.id && removed.has(comment.id)))
    .map(comment =>
      comment.replies && comment.replies.length > 0
        ? ({ ...comment, replies: filterBlockedComments(comment.replies, blockedUserIds) } as T)
        : comment
    );
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

/**
 * How many comments on each post a viewer won't see because of their blocks:
 * a blocked person's comments plus every reply under them, the same set
 * filterBlockedComments drops. Only `visible` comments are counted, so
 * subtract the result from a `status: "visible"` count. Returns an empty map
 * (and runs no queries) when nobody is blocked.
 */
export async function countHiddenComments(
  postIds: string[],
  blockedUserIds: string[]
): Promise<Map<string, number>> {
  const hidden = new Map<string, number>();
  if (postIds.length === 0 || blockedUserIds.length === 0) return hidden;

  const seen = new Set<string>();
  const take = (rows: Array<{ id: string; postId: string; status: string }>) => {
    const fresh = rows.filter((row) => !seen.has(row.id));
    for (const row of fresh) {
      seen.add(row.id);
      if (row.status === "visible") hidden.set(row.postId, (hidden.get(row.postId) ?? 0) + 1);
    }
    return fresh.map((row) => row.id);
  };

  const select = { id: true, postId: true, status: true } as const;
  let frontier = take(
    await db.comment.findMany({
      where: { postId: { in: postIds }, authorId: { in: blockedUserIds } },
      select,
    })
  );
  // Walk down the reply threads one level per query
  while (frontier.length > 0) {
    frontier = take(await db.comment.findMany({ where: { parentId: { in: frontier } }, select }));
  }
  return hidden;
}

/** A visible-comment count with the viewer's hidden comments taken out. */
export function visibleCommentCount(postId: string, rawCount: number, hidden: Map<string, number>): number {
  return Math.max(rawCount - (hidden.get(postId) ?? 0), 0);
}

/**
 * Every DID a blocked person might appear under in a RingHub feed item
 * (`actorDid` / `submittedBy`): their account DID, a pre-migration DID, and
 * their signing-key DID.
 */
export async function getBlockedUserDids(blockedUserIds: string[]): Promise<Set<string>> {
  const dids = new Set<string>();
  if (blockedUserIds.length === 0) return dids;
  const users = await db.user.findMany({
    where: { id: { in: blockedUserIds } },
    select: { did: true, originalDid: true, userDID: { select: { did: true } } },
  });
  for (const user of users) {
    for (const did of [user.did, user.originalDid, user.userDID?.did]) {
      if (did) dids.add(did);
    }
  }
  return dids;
}

/**
 * Drop RingHub feed items whose author the viewer blocked: matched on the
 * item's DIDs, and for this instance's own posts also on the local post's
 * author (a post can outlive the DID it was submitted under).
 */
export async function filterBlockedRingHubItems<
  T extends { uri?: string | null; actorDid?: string | null; submittedBy?: string | null }
>(items: T[], blockedUserIds: string[]): Promise<T[]> {
  if (items.length === 0 || blockedUserIds.length === 0) return items;

  const localPostId = (item: T) =>
    item.uri && isOurThreadSteadInstance(item.uri) ? extractPostIdFromUri(item.uri) : null;
  const postIds = items.map(localPostId).filter((id): id is string => !!id);

  const [blockedDids, blockedPosts] = await Promise.all([
    getBlockedUserDids(blockedUserIds),
    postIds.length > 0
      ? db.post.findMany({ where: { id: { in: postIds }, authorId: { in: blockedUserIds } }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  const blockedPostIds = new Set(blockedPosts.map((post) => post.id));

  return items.filter((item) => {
    if (item.actorDid && blockedDids.has(item.actorDid)) return false;
    if (item.submittedBy && blockedDids.has(item.submittedBy)) return false;
    const postId = localPostId(item);
    return !(postId && blockedPostIds.has(postId));
  });
}
