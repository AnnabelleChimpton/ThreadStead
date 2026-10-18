/**
 * Who can see a post — the one place these rules live.
 *
 *   public     everyone
 *   followers  people with an accepted follow of the author
 *   friends    mutual accepted follows (each follows the other)
 *   private    the author only
 *
 * Used by the profile posts API, the single-post API, SSR fetchers and the
 * Following feed.
 */
import type { Prisma, Visibility } from "@prisma/client";
import { db } from "@/lib/config/database/connection";

export interface ViewerRelationship {
  isAuthor: boolean;
  /** viewer → author follow is accepted */
  isFollower: boolean;
  /** follows are accepted in both directions */
  isFriend: boolean;
}

const STRANGER: ViewerRelationship = { isAuthor: false, isFollower: false, isFriend: false };

/** The visibilities a viewer with this relationship may read. */
export function allowedVisibilities(rel: ViewerRelationship): Visibility[] {
  if (rel.isAuthor) return ["public", "followers", "friends", "private"];
  const allowed: Visibility[] = ["public"];
  if (rel.isFollower) allowed.push("followers");
  if (rel.isFriend) allowed.push("friends");
  return allowed;
}

export function canViewPost(visibility: Visibility, rel: ViewerRelationship): boolean {
  return allowedVisibilities(rel).includes(visibility);
}

export async function getViewerRelationship(
  viewerId: string | null | undefined,
  authorId: string
): Promise<ViewerRelationship> {
  if (!viewerId) return STRANGER;
  if (viewerId === authorId) return { isAuthor: true, isFollower: false, isFriend: false };

  const [viewerFollowsAuthor, authorFollowsViewer] = await Promise.all([
    db.follow.findUnique({
      where: { followerId_followeeId: { followerId: viewerId, followeeId: authorId } },
    }),
    db.follow.findUnique({
      where: { followerId_followeeId: { followerId: authorId, followeeId: viewerId } },
    }),
  ]);

  const isFollower = viewerFollowsAuthor?.status === "accepted";
  const isFriend = isFollower && authorFollowsViewer?.status === "accepted";
  return { isAuthor: false, isFollower, isFriend };
}

export async function getAllowedVisibilities(
  viewerId: string | null | undefined,
  authorId: string
): Promise<Visibility[]> {
  return allowedVisibilities(await getViewerRelationship(viewerId, authorId));
}

/**
 * Posts the viewer may read from the people they follow: public and
 * followers posts from everyone they follow, friends posts only from
 * those who follow back, never private.
 */
export function followingPostsWhere(followeeIds: string[], friendIds: string[]): Prisma.PostWhereInput {
  const friendSet = new Set(friendIds);
  const mutuals = followeeIds.filter((id) => friendSet.has(id));

  const OR: Prisma.PostWhereInput[] = [
    { visibility: { in: allowedVisibilities({ isAuthor: false, isFollower: true, isFriend: false }) } },
  ];
  if (mutuals.length > 0) {
    OR.push({ visibility: "friends", authorId: { in: mutuals } });
  }
  return { authorId: { in: followeeIds }, OR };
}

/**
 * Who the viewer follows (accepted) and which of them follow back.
 * Two indexed lookups: the Follow PK for the first, (followeeId, status)
 * for the second.
 */
export async function getFollowGraph(viewerId: string): Promise<{ followeeIds: string[]; friendIds: string[] }> {
  const following = await db.follow.findMany({
    where: { followerId: viewerId, status: "accepted" },
    select: { followeeId: true },
  });
  const followeeIds = following.map((f) => f.followeeId);
  if (followeeIds.length === 0) return { followeeIds, friendIds: [] };

  const followsBack = await db.follow.findMany({
    where: { followeeId: viewerId, status: "accepted", followerId: { in: followeeIds } },
    select: { followerId: true },
  });
  return { followeeIds, friendIds: followsBack.map((f) => f.followerId) };
}
