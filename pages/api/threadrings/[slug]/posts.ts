import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth-server';
import { createAuthenticatedRingHubClient } from '@/lib/ringhub-user-operations';
import { featureFlags } from '@/lib/feature-flags';
import { getRingHubClient } from '@/lib/ringhub-client';

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
      const feedOptions = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      if (viewer) {
        // Authenticated request - get enhanced data
        const authenticatedClient = await createAuthenticatedRingHubClient(viewer.id);
        
        switch (scope) {
          case 'current':
            posts = await authenticatedClient.getRingFeed(slug, feedOptions);
            break;
          case 'parent':
            // TODO: Implement parent ring feed if Ring Hub supports it
            posts = { posts: [], total: 0 };
            break;
          case 'children':
            // TODO: Implement children ring feed if Ring Hub supports it
            posts = { posts: [], total: 0 };
            break;
          case 'family':
            // TODO: Implement family ring feed if Ring Hub supports it
            posts = { posts: [], total: 0 };
            break;
          default:
            posts = await authenticatedClient.getRingFeed(slug, feedOptions);
        }
      } else {
        // Unauthenticated request - get public data only
        const publicClient = getRingHubClient();
        
        if (!publicClient) {
          throw new Error('Ring Hub client not available');
        }
        
        switch (scope) {
          case 'current':
            posts = await publicClient.getRingFeed(slug, feedOptions);
            break;
          case 'parent':
            // TODO: Implement parent ring feed if Ring Hub supports it  
            posts = { posts: [], total: 0 };
            break;
          case 'children':
            // TODO: Implement children ring feed if Ring Hub supports it
            posts = { posts: [], total: 0 };
            break;
          case 'family':
            // TODO: Implement family ring feed if Ring Hub supports it
            posts = { posts: [], total: 0 };
            break;
          default:
            posts = await publicClient.getRingFeed(slug, feedOptions);
        }
      }
      
      console.log(`Fetched ${posts?.posts?.length || 0} posts for ${slug} (scope: ${scope})`);

      // Calculate hasMore based on returned data
      const currentOffset = parseInt(offset as string);
      const currentLimit = parseInt(limit as string);
      const hasMore = (posts?.total || 0) > (currentOffset + (posts?.posts?.length || 0));

      return res.json({
        posts: posts?.posts || [],
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