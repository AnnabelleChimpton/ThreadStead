import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth-server';
import { createAuthenticatedRingHubClient } from '@/lib/ringhub-user-operations';
import { featureFlags } from '@/lib/feature-flags';
import { getRingHubClient } from '@/lib/ringhub-client';

/**
 * Get ThreadRing Lineage Data
 * 
 * Fetches lineage information for a ring using user-authenticated Ring Hub client
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { slug } = req.query;
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug parameter' });
  }

  try {
    // Get current user for optional authentication (enhanced genealogy tree if authenticated)
    const viewer = await getSessionUser(req);

    // Only fetch from Ring Hub if enabled
    if (!featureFlags.ringhub()) {
      return res.status(200).json({
        lineage: [],
        directChildrenCount: 0,
        totalDescendantsCount: 0,
        lineageDepth: 0,
        lineagePath: ""
      });
    }

    console.log(`Fetching Ring Hub lineage for ${slug}${viewer ? ' (authenticated - full genealogy tree)' : ' (unauthenticated - public lineage)'}...`);
    
    try {
      // Fetch lineage data (authenticated gets full genealogy tree, unauthenticated gets public data)
      let lineageData;
      
      if (viewer) {
        // Authenticated request - get full genealogy tree
        const authenticatedClient = await createAuthenticatedRingHubClient(viewer.id);
        lineageData = await authenticatedClient.getRingLineage(slug);
      } else {
        // Unauthenticated request - get public lineage data
        const publicClient = getRingHubClient();
        
        if (!publicClient) {
          throw new Error('Ring Hub client not available');
        }
        
        lineageData = await publicClient.getRingLineage(slug);
      }
      
      console.log(`Fetched lineage data for ${slug}:`, {
        parents: lineageData?.parents?.length || 0,
        children: lineageData?.children?.length || 0,
        ancestors: lineageData?.ancestors?.length || 0
      });

      // Calculate lineage metrics from Ring Hub data
      const parents = lineageData?.parents || [];
      const children = lineageData?.children || [];
      const ancestors = lineageData?.ancestors || [];
      
      const lineageDepth = ancestors.length;
      const lineagePath = ancestors.map(r => r.name).join(' → ') || (ancestors.length === 0 ? 'Root' : '');
      const directChildrenCount = children.length;
      
      // Total descendants would require recursive calculation
      // For now, just use direct children count
      const totalDescendantsCount = directChildrenCount;

      return res.json({
        lineage: ancestors, // Full lineage path from root to current
        parents,
        children,
        ancestors,
        directChildrenCount,
        totalDescendantsCount,
        lineageDepth,
        lineagePath,
        authenticated: !!viewer,
        fullGenealogy: !!viewer // Full genealogy tree available when authenticated
      });

    } catch (ringHubError) {
      console.error('Ring Hub lineage fetch failed:', ringHubError);
      return res.status(500).json({ 
        error: "Failed to fetch lineage from Ring Hub",
        message: ringHubError instanceof Error ? ringHubError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error fetching lineage:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch lineage data'
    });
  }
}