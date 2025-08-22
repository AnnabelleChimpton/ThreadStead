import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";
import { filterBlockedUsers } from "@/lib/threadring-blocks";
import { withThreadRingSupport } from "@/lib/ringhub-middleware";
import { getRingHubClient } from "@/lib/ringhub-client";

export default withThreadRingSupport(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));

    // Use Ring Hub if enabled
    if (system === 'ringhub') {
      const client = getRingHubClient();
      if (!client) {
        return res.status(500).json({ error: "Ring Hub client not configured" });
      }

      // First verify the ring exists
      const ringDescriptor = await client.getRing(slug as string);
      if (!ringDescriptor) {
        return res.status(404).json({ error: "ThreadRing not found" });
      }

      try {
        // Get the ring feed from Ring Hub
        const feed = await client.getRingFeed(slug as string, { 
          limit, 
          offset 
        });

        // Transform PostRef objects to expected post format
        // Note: Ring Hub returns PostRef objects that reference external content
        // For now, we'll return empty posts since we don't have the actual post content
        const transformedPosts = feed.posts.map(postRef => ({
          id: postRef.uri || postRef.digest,
          authorId: postRef.submittedBy || 'unknown',
          authorUsername: postRef.submittedBy?.split(':').pop() || 'external-user',
          authorDisplayName: null,
          authorAvatarUrl: null,
          createdAt: postRef.submittedAt || new Date().toISOString(),
          updatedAt: postRef.submittedAt || new Date().toISOString(),
          title: postRef.metadata?.title || 'External Post',
          bodyHtml: `<p>This is a reference to external content: <a href="${postRef.uri}" target="_blank" rel="noopener noreferrer">${postRef.metadata?.title || 'View Post'}</a></p>`,
          bodyText: `External content: ${postRef.metadata?.title || postRef.uri}`,
          bodyMarkdown: `[${postRef.metadata?.title || 'External Post'}](${postRef.uri})`,
          media: [],
          tags: [],
          visibility: 'public',
          commentCount: 0,
          threadRings: [],
          isPinned: false,
          pinnedAt: null
        }));

        return res.json({
          posts: transformedPosts,
          hasMore: feed.posts.length === limit
        });

      } catch (feedError) {
        console.error("Error fetching Ring Hub feed:", feedError);
        // Return empty posts rather than error to avoid breaking the UI
        return res.json({
          posts: [],
          hasMore: false
        });
      }
    }

    // Original local database logic
    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { id: true, visibility: true }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    const viewer = await getSessionUser(req);

    // Check if viewer can access this ThreadRing
    if (threadRing.visibility === "private") {
      if (!viewer) {
        return res.status(403).json({ error: "Authentication required" });
      }
      
      // Check if viewer is a member of this ThreadRing
      const membership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: threadRing.id,
            userId: viewer.id
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Build visibility filter based on viewer's relationship with post authors
    let visibilityFilter: any = { visibility: "public" };

    if (viewer) {
      // Get all ThreadRing member IDs for relationship checking
      const members = await db.threadRingMember.findMany({
        where: { threadRingId: threadRing.id },
        select: { userId: true }
      });
      const memberIds = members.map(m => m.userId);

      // Get viewer's follows to these members
      const viewerFollows = await db.follow.findMany({
        where: {
          followerId: viewer.id,
          followeeId: { in: memberIds },
          status: "accepted"
        },
        select: { followeeId: true }
      });
      const followedIds = viewerFollows.map(f => f.followeeId);

      // Get mutual follows (friends) with these members
      const mutualFollows = await db.follow.findMany({
        where: {
          followerId: { in: followedIds },
          followeeId: viewer.id,
          status: "accepted"
        },
        select: { followerId: true }
      });
      const friendIds = mutualFollows.map(f => f.followerId);

      // Build complex visibility filter
      visibilityFilter = {
        OR: [
          { visibility: "public" },
          { authorId: viewer.id }, // Viewer's own posts
          {
            AND: [
              { visibility: "followers" },
              { authorId: { in: followedIds } }
            ]
          },
          {
            AND: [
              { visibility: "friends" },
              { authorId: { in: friendIds } }
            ]
          }
        ]
      };
    }

    // Fetch posts associated with this ThreadRing
    const posts = await db.post.findMany({
      where: {
        ...visibilityFilter,
        threadRings: {
          some: {
            threadRingId: threadRing.id
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
          select: {
            id: true
          }
        },
        threadRings: {
          where: {
            threadRingId: threadRing.id
          },
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
        // Sort pinned posts first
        {
          threadRings: {
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

    // Get pinned status for posts in this specific ThreadRing
    const postIds = posts.map(p => p.id);
    const pinnedPosts = await db.postThreadRing.findMany({
      where: {
        postId: { in: postIds },
        threadRingId: threadRing.id,
        isPinned: true
      },
      select: {
        postId: true,
        isPinned: true,
        pinnedAt: true
      }
    });
    
    const pinnedMap = new Map(pinnedPosts.map(p => [p.postId, p]));

    // Filter out posts from blocked users
    const authorIds = posts.map(post => post.authorId);
    const allowedAuthorIds = await filterBlockedUsers(threadRing.id, authorIds);
    const filteredPosts = posts.filter(post => allowedAuthorIds.includes(post.authorId));

    // Transform posts to include username and comment count
    const transformedPosts = filteredPosts.map(post => {
      const pinned = pinnedMap.get(post.id);
      return {
        id: post.id,
        authorId: post.authorId,
        authorUsername: post.author.handles[0]?.handle || null,
        authorDisplayName: post.author.profile?.displayName || null,
        authorAvatarUrl: post.author.profile?.avatarUrl || null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        title: post.title,
        bodyHtml: post.bodyHtml,
        bodyText: post.bodyText,
        bodyMarkdown: post.bodyMarkdown,
        media: post.media,
        tags: post.tags,
        visibility: post.visibility,
        commentCount: post.comments.length,
        threadRings: post.threadRings,
        isPinned: pinned?.isPinned || false,
        pinnedAt: pinned?.pinnedAt || null
      };
    });
    
    // Sort to ensure pinned posts are first
    transformedPosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.json({ 
      posts: transformedPosts,
      hasMore: posts.length === limit // Note: filtering may affect pagination, but this is acceptable
    });

  } catch (error) {
    console.error("Error fetching ThreadRing posts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});