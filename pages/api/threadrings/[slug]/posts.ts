import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth-server';
import { createAuthenticatedRingHubClient } from '@/lib/ringhub-user-operations';
import { featureFlags } from '@/lib/feature-flags';
import { getRingHubClient } from '@/lib/ringhub-client';
import { db } from '@/lib/db';

/**
 * Extract post ID from ThreadStead post URI
 */
function extractPostIdFromUri(uri: string): string | null {
  // Expected format: https://domain.com/resident/username/post/POST_ID
  const match = uri.match(/\/post\/([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : null;
}

/**
 * Check if URI belongs to our ThreadStead instance
 */
function isOurThreadSteadInstance(uri: string): boolean {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ourDomain = baseUrl.replace(/https?:\/\//, '');
  
  try {
    const url = new URL(uri);
    return url.host === ourDomain || url.hostname === ourDomain;
  } catch {
    return false;
  }
}

/**
 * Resolve Ring Hub post references to actual ThreadStead post objects
 */
async function resolveRingHubPosts(ringHubPosts: any[], _viewer: any) {
  const resolvedPosts = [];
  
  for (const ringHubPost of ringHubPosts) {
    try {
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

      if (post) {
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
            id: tr.threadRing.id,
            name: tr.threadRing.name,
            slug: tr.threadRing.slug,
            visibility: tr.threadRing.visibility
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
          }
        };
        
        resolvedPosts.push(transformedPost);
      } else {
        console.warn('Post not found in ThreadStead database:', postId);
      }
    } catch (error) {
      console.error('Error resolving Ring Hub post:', ringHubPost.uri, error);
    }
  }
  
  return resolvedPosts;
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
  const { scope = 'current', limit = '20', offset = '0' } = req.query;

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
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: false
      });
    }

    console.log(`Fetching Ring Hub posts for ${slug} with scope: ${scope}${viewer ? ' (authenticated)' : ' (unauthenticated)'}...`);
    
    try {
      // Create Ring Hub client (authenticated if user available, otherwise unauthenticated)
      let posts;
      
      // Map our scope values to Ring Hub scope values
      const mapScope = (scope: string) => {
        switch (scope) {
          case 'current': return 'ring';
          case 'parent': return 'parent';
          case 'children': return 'children';
          case 'family': return 'family';
          default: return 'ring';
        }
      };
      
      const feedOptions = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        scope: mapScope(scope as string) as 'ring' | 'parent' | 'children' | 'family'
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
      
      console.log(`Fetched ${posts?.posts?.length || 0} posts for ${slug} (scope: ${scope})`);

      // Resolve Ring Hub post references to actual ThreadStead post objects
      const resolvedPosts = await resolveRingHubPosts(posts?.posts || [], viewer);
      console.log(`Resolved ${resolvedPosts.length} posts for ${slug}`);

      // Calculate hasMore based on returned data
      const currentOffset = parseInt(offset as string);
      const currentLimit = parseInt(limit as string);
      const hasMore = (posts?.total || 0) > (currentOffset + (posts?.posts?.length || 0));

      return res.json({
        posts: resolvedPosts,
        total: posts?.total || 0,
        limit: currentLimit,
        offset: currentOffset,
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