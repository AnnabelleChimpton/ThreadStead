import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client';
import { db } from '@/lib/config/database/connection';
import {
  extractPostIdFromUri,
  isOurThreadSteadInstance,
  noteMissingLocalPost,
} from '@/lib/domain/threadrings/orphan-postrefs';
import { canViewPost, getViewerRelationship, type ViewerRelationship } from '@/lib/domain/posts/visibility';
import { parseOffsetPagination } from '@/lib/server/http/pagination';
import { getUserBlockedIds, getBlockedUserDids } from '@/lib/domain/users/blocks';

/**
 * Resolve Ring Hub post references to actual ThreadStead post objects.
 *
 * A local post the viewer may not read (followers, friends or private), or
 * one by someone the viewer blocked, is left out entirely: no title, body or
 * placeholder. `hidden` counts them so the response total can be adjusted.
 */
async function resolveRingHubPosts(ringHubPosts: any[], viewer: { id: string } | null) {
  const resolvedPosts = [];
  let hidden = 0;
  const blockedUserIds = viewer ? (await getUserBlockedIds(viewer.id)).blockedUserIds : [];
  const blockedDids = await getBlockedUserDids(blockedUserIds);
  // One relationship lookup per author, not per post
  const relationships = new Map<string, Promise<ViewerRelationship>>();
  const relationshipTo = (authorId: string) => {
    if (!relationships.has(authorId)) relationships.set(authorId, getViewerRelationship(viewer?.id, authorId));
    return relationships.get(authorId)!;
  };

  for (const ringHubPost of ringHubPosts) {
    try {
      if (blockedDids.has(ringHubPost.actorDid) || blockedDids.has(ringHubPost.submittedBy)) {
        hidden++;
        continue;
      }

      // Check if this post is from our ThreadStead instance
      if (!isOurThreadSteadInstance(ringHubPost.uri)) {
        // External post - create a link-only representation
        // Use ring slug + post ID to avoid collisions between different external sources
        const externalPost = {
          id: `external-${ringHubPost.ringSlug}-${ringHubPost.id}`,
          title: ringHubPost.metadata?.title || 'External Post',
          isExternal: true,
          externalUrl: ringHubPost.uri,
          bodyHtml: `<p>This post is from an external source. <a href="${ringHubPost.uri}" target="_blank" rel="noopener noreferrer">View original post</a></p>`,
          bodyMarkdown: `This post is from an external source. [View original post](${ringHubPost.uri})`,
          intent: null,
          visibility: 'public',
          createdAt: ringHubPost.submittedAt,
          updatedAt: ringHubPost.submittedAt,
          author: {
            id: 'external',
            displayName: ringHubPost.metadata?.actorName || ringHubPost.submittedBy.split(':').pop() || 'User',
            avatarUrl: null,
            handle: 'external',
            // Don't provide primaryHandle so PostHeader won't try to create local links
            primaryHandle: undefined
          },
          threadRings: [],
          // Include Ring Hub metadata
          ringHubData: {
            id: ringHubPost.id,
            ringSlug: ringHubPost.ringSlug,
            submittedAt: ringHubPost.submittedAt,
            submittedBy: ringHubPost.submittedBy,
            status: ringHubPost.status,
            pinned: ringHubPost.pinned,
            metadata: ringHubPost.metadata
          }
        };

        resolvedPosts.push(externalPost);
        continue;
      }

      // Extract post ID from the URI for our instance
      const postId = extractPostIdFromUri(ringHubPost.uri);

      if (!postId) {
        console.warn('Could not extract post ID from URI:', ringHubPost.uri);
        continue;
      }

      // Fetch the actual post from ThreadStead database
      const post = await db.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            include: {
              handles: true,
              profile: true
            }
          },
          threadRings: {
            include: {
              threadRing: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  visibility: true
                }
              }
            }
          }
        }
      });

      if (post && blockedUserIds.includes(post.authorId)) {
        hidden++;
      } else if (post && post.visibility !== 'public' && !canViewPost(post.visibility, await relationshipTo(post.authorId))) {
        hidden++;
      } else if (post) {
        // Transform to the format expected by the frontend
        const transformedPost = {
          id: post.id,
          title: post.title,
          bodyHtml: post.bodyHtml,
          bodyMarkdown: post.bodyMarkdown,
          intent: post.intent,
          visibility: post.visibility,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          tags: post.tags || [],
          // Spoiler content warning fields
          isSpoiler: post.isSpoiler,
          contentWarning: post.contentWarning,
          author: {
            id: post.author.id,
            displayName: post.author.profile?.displayName,
            avatarUrl: post.author.profile?.avatarUrl,
            handle: post.author.handles.find(h => h.host === "local")?.handle ||
              post.author.handles[0]?.handle || 'unknown',
            primaryHandle: post.author.handles.find(h => h.host === "local")?.handle ||
              post.author.handles[0]?.handle || 'unknown'
          },
          threadRings: post.threadRings?.map(tr => ({
            threadRing: {
              id: tr.threadRing.id,
              name: tr.threadRing.name,
              slug: tr.threadRing.slug
            }
          })) || [],
          // Include Ring Hub metadata
          ringHubData: {
            id: ringHubPost.id,
            ringSlug: ringHubPost.ringSlug,
            submittedAt: ringHubPost.submittedAt,
            submittedBy: ringHubPost.submittedBy,
            status: ringHubPost.status,
            pinned: ringHubPost.pinned,
            metadata: ringHubPost.metadata
          },
          metadata: post.metadata // Include journal metadata from local post
        };

        resolvedPosts.push(transformedPost);
      } else {
        // Deleted locally, but the hub PostRef outlived it (deletions before
        // 2026-07 never reached the hub). Skip it; log once per post ID.
        noteMissingLocalPost(postId, ringHubPost);
      }
    } catch (error) {
      console.error('Error resolving Ring Hub post:', ringHubPost.uri, error);
    }
  }

  return { posts: resolvedPosts, hidden };
}

/**
 * Get ThreadRing Posts
 * 
 * Fetches posts/feed for a ring using user-authenticated Ring Hub client
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { slug } = req.query;
  const { scope = 'current' } = req.query;
  const { limit, offset } = parseOffsetPagination(req.query, { defaultLimit: 20 });

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug parameter' });
  }

  try {
    // Get current user for optional authentication (enhanced data if authenticated)
    const viewer = await getSessionUser(req);

    // Only fetch from Ring Hub if enabled
    if (!featureFlags.ringhub()) {
      return res.status(200).json({
        posts: [],
        total: 0,
        limit,
        offset,
        hasMore: false
      });
    }

    try {
      // Create Ring Hub client (authenticated if user available, otherwise unauthenticated)
      let posts;

      // Map our scope values to Ring Hub scope values
      const mapScope = (scope: string) => {
        switch (scope) {
          case 'current': return 'ring';
          case 'parent': return 'parent';
          case 'children': return 'children';
          case 'siblings': return 'siblings';
          case 'family': return 'family';
          default: return 'ring';
        }
      };

      const feedOptions = {
        limit,
        offset,
        scope: mapScope(scope as string) as 'ring' | 'parent' | 'children' | 'siblings' | 'family'
      };

      if (viewer) {
        // Authenticated request - get enhanced data
        const authenticatedClient = createAuthenticatedRingHubClient(viewer.id);
        posts = await authenticatedClient.getRingFeed(slug, feedOptions);
      } else {
        // Unauthenticated request - get public data only
        const publicClient = getRingHubClient();

        if (!publicClient) {
          throw new Error('Ring Hub client not available');
        }

        posts = await publicClient.getRingFeed(slug, feedOptions);
      }

      // Filter out prompts from the posts feed (they're displayed separately as active prompts)
      const nonPromptPosts = posts?.posts?.filter(post =>
        post.metadata?.type !== 'threadring_prompt'
      ) || [];

      // Resolve Ring Hub post references to actual ThreadStead post objects
      const { posts: resolvedPosts, hidden } = await resolveRingHubPosts(nonPromptPosts, viewer);

      // Pagination follows the hub's PostRefs, so filtering (prompts, posts
      // this viewer can't read) never skips or repeats a page: the next page
      // starts at nextOffset. `total` drops what this page hid; hidden posts
      // on other pages are only known once those pages are read.
      const currentOffset = offset;
      const currentLimit = limit;
      const rawCount = posts?.posts?.length || 0;
      const hasMore = (posts?.total || 0) > (currentOffset + rawCount);

      return res.json({
        posts: resolvedPosts,
        total: Math.max((posts?.total || 0) - hidden, 0),
        limit: currentLimit,
        offset: currentOffset,
        nextOffset: currentOffset + rawCount,
        hasMore,
        scope,
        authenticated: !!viewer,
        enhanced: !!viewer // Enhanced data available when authenticated
      });

    } catch (ringHubError) {
      console.error('Ring Hub posts fetch failed:', ringHubError);
      return res.status(500).json({
        error: "Failed to fetch posts from Ring Hub",
        message: ringHubError instanceof Error ? ringHubError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch posts data'
    });
  }
}