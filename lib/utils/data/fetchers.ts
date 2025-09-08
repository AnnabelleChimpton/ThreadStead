// Direct database data fetchers for use in getServerSideProps
// Avoids internal HTTP calls that can cause crashes and performance issues

import { db } from "../../db";
import { SITE_NAME } from "../../site-config";

export async function getPostsForUser(username: string, viewerId?: string) {
  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: true },
  });
  if (!handle) return null;

  const authorId = handle.user.id;

  // default: public only
  let allowed = new Set(["public"]);

  if (viewerId === authorId) {
    // author sees everything
    allowed = new Set(["public", "followers", "friends", "private"]);
  } else if (viewerId) {
    // check relationships
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

    if (isFollower) allowed.add("followers");
    if (isFriend) allowed.add("friends");
  }

  const posts = await db.post.findMany({
    where: { authorId, visibility: { in: Array.from(allowed) as any } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: {
        select: {
          id: true,
          primaryHandle: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  });

  return { posts };
}

export async function getGuestbookForUser(username: string) {
  const ownerHandle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: true },
  });
  if (!ownerHandle) return null;

  const entries = await db.guestbookEntry.findMany({
    where: { profileOwner: ownerHandle.user.id, status: "visible" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  
  // Get unique author IDs (excluding null values)
  const authorIds = [...new Set(entries.map(e => e.authorId).filter(Boolean))];
  
  // Fetch handles for these authors
  const authorHandles = await db.handle.findMany({
    where: { 
      userId: { in: authorIds as string[] },
      host: SITE_NAME
    },
    select: {
      userId: true,
      handle: true
    }
  });
  
  // Create a map of userId -> handle
  const userHandleMap = new Map(authorHandles.map(h => [h.userId, h.handle]));
  
  // Transform entries to include username
  const transformedEntries = entries.map(entry => ({
    ...entry,
    authorUsername: entry.authorId ? userHandleMap.get(entry.authorId) || null : null
  }));
  
  return { entries: transformedEntries };
}

export async function getPhotosForUser(username: string, page: number = 1, limit: number = 20) {
  // Find the user by handle
  const handle = await db.handle.findFirst({
    where: { 
      handle: username, 
      host: SITE_NAME 
    },
    include: {
      user: true
    }
  });

  if (!handle) return null;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Get all media for this user (images only)
  const [media, totalCount] = await Promise.all([
    db.media.findMany({
      where: {
        userId: handle.user.id,
        mediaType: "image", // Only images, not MIDI files
        visibility: "public" // Only show public media for now
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        caption: true,
        thumbnailUrl: true,
        mediumUrl: true,
        fullUrl: true,
        featured: true,
        featuredOrder: true,
        createdAt: true,
        visibility: true,
        width: true,
        height: true,
        fileSize: true
      }
    }),
    db.media.count({
      where: {
        userId: handle.user.id,
        mediaType: "image", // Only count images
        visibility: "public"
      }
    })
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    media,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage
    }
  };
}