import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client';

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
        ring: lineageData?.ring?.name,
        ancestors: lineageData?.ancestors?.length || 0,
        descendants: lineageData?.descendants?.length || 0
      });

      // Extract data from Ring Hub response format
      const ring = lineageData?.ring;
      const ancestors = lineageData?.ancestors || [];
      const descendants = lineageData?.descendants || [];

      // Calculate parent (immediate ancestor) and children (immediate descendants)
      const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
      const parents = parent ? [parent] : [];
      const children = descendants; // Direct children are at the top level of descendants

      const lineageDepth = ancestors.length;
      const lineagePath = ancestors.map(r => r.name).join(' → ') || (ring?.name || 'Root');

      // Count all descendants recursively
      const countDescendants = (nodes: any[]): number => {
        let count = 0;
        for (const node of nodes) {
          count++;
          if (node.children && Array.isArray(node.children)) {
            count += countDescendants(node.children);
          }
        }
        return count;
      };

      const directChildrenCount = descendants.length;
      const totalDescendantsCount = countDescendants(descendants);

      // Fetch siblings if ring has a parent
      let siblings: any[] = [];
      let siblingsCount = 0;

      if (parent && parent.slug) {
        try {
          // Fetch parent's lineage to get all its descendants (siblings of current ring)
          let parentLineageData;

          if (viewer) {
            const authenticatedClient = await createAuthenticatedRingHubClient(viewer.id);
            parentLineageData = await authenticatedClient.getRingLineage(parent.slug);
          } else {
            const publicClient = getRingHubClient();
            if (publicClient) {
              parentLineageData = await publicClient.getRingLineage(parent.slug);
            }
          }

          if (parentLineageData?.descendants) {
            // Siblings are parent's descendants excluding current ring
            siblings = parentLineageData.descendants.filter((d: any) => d.slug !== slug);
            siblingsCount = siblings.length;
          }
        } catch (error) {
          console.error('Error fetching siblings from Ring Hub:', error);
          // Continue without siblings data rather than failing
        }
      }

      return res.json({
        lineage: ancestors, // Full lineage path from root to current
        ring, // Current ring info
        parents,
        children,
        siblings, // Sibling rings (other children of same parent)
        ancestors,
        descendants, // Full descendants tree
        directChildrenCount,
        totalDescendantsCount,
        siblingsCount,
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