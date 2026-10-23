import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import { getPublicRingHubClient, type RingHubClient } from '@/lib/api/ringhub/ringhub-client';
import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors';
import { readAsViewer } from '@/lib/rings/read-as-viewer';
import { db } from '@/lib/config/database/connection';
import {
  extractPostIdFromUri,
  isOurThreadSteadInstance,
  noteMissingLocalPost,
} from '@/lib/domain/threadrings/orphan-postrefs';
import { canViewPost, getViewerRelationship, type ViewerRelationship } from '@/lib/domain/posts/visibility';
import { parseOffsetPagination } from '@/lib/server/http/pagination';
import { getHiddenIds, getBlockedUserDids } from '@/lib/domain/users/blocks';

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
  // Suspended or banned authors for everyone, plus the viewer's blocks
  const { blockedUserIds } = await getHiddenIds(viewer?.id);
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
            profile: {
              displayName: ringHubPost.metadata?.actorName || ringHubPost.submittedBy.split(':').pop() || 'User',
              avatarUrl: null,
            },
            handle: 'external',
            // Don't provide primaryHandle so PostHeader won't try to create local links
            primaryHandle: undefined
          },
          threadRings: [],
          ...ringModeration(ringHubPost),
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
            profile: {
              displayName: post.author.profile?.displayName,
              avatarUrl: post.author.profile?.avatarUrl,
            },
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
          ...ringModeration(ringHubPost),
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

/** What the ring's host and moderators act on: the hub's PostRef, and whether it's pinned. */
function ringModeration(ringHubPost: any) {
  return { ringHubPostId: ringHubPost.id as string, isPinned: !!ringHubPost.pinned };
}

/** Prompts show separately, as the active prompt; fork notices aren't posts. */
function isFeedPost(ref: any) {
  return ref.metadata?.type !== 'threadring_prompt' && ref.metadata?.type !== 'fork_notification';
}

/** Hub pages read for one request, at most, when the first ones have nothing this viewer can see */
const MAX_HUB_PAGES = 5;

type FeedOptions = Parameters<RingHubClient['getRingFeed']>[1];

/** One page of the ring's feed, signed as the viewer so a private ring's members can read it. */
function readFeedPage(slug: string, viewer: { id: string } | null, options: FeedOptions) {
  const asPublic = () => {
    const client = getPublicRingHubClient();
    if (!client) throw new RingHubUnavailableError('Ring Hub client not available');
    return client.getRingFeed(slug, options);
  };
  const asViewer = viewer
    ? () => createAuthenticatedRingHubClient(viewer.id).getRingFeedAsMember(slug, options)
    : null;
  return readAsViewer(asViewer, asPublic);
}

/** The hub's answer, passed on: a ring that isn't there for this viewer, or a hub that isn't answering. */
function hubFailure(error: unknown): [number, string] {
  const status = (error as { status?: number })?.status;
  if (status === 404) return [404, "This ring's posts aren't open to you."];
  if (status === 403) return [403, "This ring's posts are for its members."];
  if (error instanceof RingHubUnavailableError || error instanceof RingHubAuthError) {
    return [503, 'Ring Hub is slow right now. Try again in a minute.'];
  }
  return [502, "Ring Hub didn't answer. Try again in a minute."];
}

/**
 * A ring's posts, from the hub's feed: signed as the viewer, so a private
 * ring's members can read it, and resolved to this site's posts.
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

    // Map our scope values to Ring Hub scope values
    const hubScope = ({ current: 'ring', parent: 'parent', children: 'children', siblings: 'siblings', family: 'family' } as const)[
      scope as 'current'
    ] ?? 'ring';

    // Pagination follows the hub's PostRefs, so filtering (prompts, posts
    // this viewer can't read) never skips or repeats a page: the next page
    // starts at nextOffset. When a whole page is filtered away, the next is
    // read too (a few at most), so a ring with posts never says it has none.
    // `total` drops what was hidden; hidden posts on later pages are only
    // known once those pages are read.
    const resolvedPosts: any[] = [];
    let hidden = 0;
    let total = 0;
    let nextOffset = offset;
    let hasMore = false;
    try {
      for (let pages = 0; pages < MAX_HUB_PAGES && (pages === 0 || (resolvedPosts.length === 0 && hasMore)); pages++) {
        const page = await readFeedPage(slug, viewer, { limit, offset: nextOffset, scope: hubScope });
        const refs = page?.posts || [];
        const resolved = await resolveRingHubPosts(refs.filter(isFeedPost), viewer);
        resolvedPosts.push(...resolved.posts);
        hidden += resolved.hidden;
        total = page?.total || 0;
        nextOffset += refs.length;
        hasMore = refs.length > 0 && total > nextOffset;
      }
    } catch (ringHubError) {
      console.error('Ring Hub posts fetch failed:', ringHubError);
      const [status, message] = hubFailure(ringHubError);
      return res.status(status).json({ error: message });
    }

    return res.json({
      posts: resolvedPosts,
      total: Math.max(total - hidden, 0),
      limit,
      offset,
      nextOffset,
      hasMore,
      scope,
      authenticated: !!viewer,
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch posts data'
    });
  }
}