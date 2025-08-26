import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { getRingHubClient, shouldUseRingHub } from "@/lib/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/ringhub-user-operations";

interface ThreadRingNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  postCount: number;
  directChildrenCount: number;
  totalDescendantsCount: number;
  lineageDepth: number;
  curatorHandle: string | null;
  createdAt: string;
  children?: ThreadRingNode[];
}

interface GenealogyStats {
  totalRings: number;
  totalMembers: number;
  totalPosts: number;
  totalActors?: number;
  maxDepth: number;
  averageChildren: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const viewer = await getSessionUser(req);
    const { rootId, maxDepth = 3 } = req.query;

    if (!shouldUseRingHub()) {
      return res.status(503).json({ error: "Ring Hub is not available" });
    }

    // Get Ring Hub client (authenticated if user is logged in)
    let ringHubClient;
    if (viewer) {
      ringHubClient = await createAuthenticatedRingHubClient(viewer.id);
    } else {
      ringHubClient = getRingHubClient();
    }

    if (!ringHubClient) {
      return res.status(503).json({ error: "Ring Hub client not available" });
    }

    // Determine the root ring
    let rootSlug = 'spool'; // Default to spool
    if (rootId && typeof rootId === 'string') {
      rootSlug = rootId;
    }

    // Get lineage data from Ring Hub
    const lineageData = await ringHubClient.getRingLineage(rootSlug);

    // Transform Ring Hub data to our format
    const transformRingToNode = (ring: any): ThreadRingNode => {
      // Calculate lineage depth from parent hierarchy
      const calculateDepth = (node: any, depth = 0): number => {
        if (!node.parentId) return depth;
        return depth + 1;
      };

      // Count total descendants recursively
      const countDescendants = (node: any): number => {
        if (!Array.isArray(node.children)) return 0;
        let count = node.children.length;
        for (const child of node.children) {
          count += countDescendants(child);
        }
        return count;
      };

      const children = Array.isArray(ring.children) ? ring.children : [];
      const totalDescendants = countDescendants(ring);

      return {
        id: ring.slug,
        name: ring.name,
        slug: ring.slug,
        description: ring.description || null,
        memberCount: ring.memberCount || 0,
        postCount: ring.postCount || 0,
        directChildrenCount: children.length,
        totalDescendantsCount: totalDescendants,
        lineageDepth: calculateDepth(ring),
        curatorHandle: null, // Will be resolved by transformers if needed
        createdAt: ring.createdAt || new Date().toISOString(),
        children: []
      };
    };

    // Build tree structure recursively
    const buildTreeStructure = (node: any): ThreadRingNode => {
      const transformedNode = transformRingToNode(node);
      if (Array.isArray(node.children)) {
        transformedNode.children = node.children.map(buildTreeStructure);
      }
      return transformedNode;
    };

    // Build the genealogy tree from Ring Hub data
    let root: ThreadRingNode;
    if (rootSlug === 'spool' && lineageData.descendants && lineageData.descendants.length > 0) {
      // For the spool, create a virtual root with all top-level rings as children
      const spoolRing = transformRingToNode(lineageData.ring);
      spoolRing.children = lineageData.descendants.map(buildTreeStructure);
      spoolRing.directChildrenCount = lineageData.descendants.length;
      spoolRing.totalDescendantsCount = lineageData.descendants.reduce((sum: number, desc: any) => {
        return sum + 1 + (desc.children ? countDescendants(desc) : 0);
      }, 0);
      root = spoolRing;
    } else if (lineageData.ring) {
      // For specific rings, use the ring itself as root with its descendants
      root = buildTreeStructure({
        ...lineageData.ring,
        children: lineageData.descendants || []
      });
    } else {
      // Fallback: create a simple root node
      root = transformRingToNode(lineageData.ring);
    }

    // Helper function for counting descendants (used above)
    function countDescendants(node: any): number {
      if (!Array.isArray(node.children)) return 0;
      let count = node.children.length;
      for (const child of node.children) {
        count += countDescendants(child);
      }
      return count;
    }

    // Apply maxDepth pruning
    const pruneToDepth = (node: ThreadRingNode, currentDepth: number): ThreadRingNode => {
      if (currentDepth >= Number(maxDepth)) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: node.children?.map(child => pruneToDepth(child, currentDepth + 1)) || []
      };
    };

    if (maxDepth) {
      root = pruneToDepth(root, 0);
    }

    // Calculate statistics efficiently using Ring Hub stats endpoint
    const calculateStats = async (node: ThreadRingNode): Promise<GenealogyStats> => {
      try {
        // Use Ring Hub stats for global network statistics
        const ringHubStats = await ringHubClient.getStats();
        
        // Calculate max depth from the tree structure
        const calculateMaxDepth = (n: ThreadRingNode): number => {
          let maxDepth = n.lineageDepth;
          if (n.children) {
            for (const child of n.children) {
              maxDepth = Math.max(maxDepth, calculateMaxDepth(child));
            }
          }
          return maxDepth;
        };

        // Calculate average children from the tree structure
        const calculateAverageChildren = (n: ThreadRingNode): number => {
          let totalRings = 1;
          let directChildrenSum = n.directChildrenCount;

          if (n.children) {
            for (const child of n.children) {
              calculateAverageChildren(child);
              totalRings += 1; // Each child adds to ring count
              directChildrenSum += child.directChildrenCount;
            }
          }

          return totalRings > 0 ? directChildrenSum / totalRings : 0;
        };

        return {
          totalRings: ringHubStats.totalRings,
          totalMembers: ringHubStats.activeMemberships, // Use active memberships for member count
          totalPosts: ringHubStats.acceptedPosts, // Use accepted posts for post count
          totalActors: ringHubStats.totalActors, // Total unique actors in the network
          maxDepth: calculateMaxDepth(root),
          averageChildren: calculateAverageChildren(root)
        };
      } catch (error) {
        console.error('Failed to get Ring Hub stats, falling back to tree calculation:', error);
        
        // Fallback to original tree traversal calculation
        let totalRings = 1;
        let totalMembers = node.memberCount;
        let totalPosts = node.postCount;
        let maxDepth = node.lineageDepth;
        let directChildrenSum = node.directChildrenCount;

        if (node.children) {
          for (const child of node.children) {
            const childStats = await calculateStats(child);
            totalRings += childStats.totalRings;
            totalMembers += childStats.totalMembers;
            totalPosts += childStats.totalPosts;
            maxDepth = Math.max(maxDepth, childStats.maxDepth);
            directChildrenSum += childStats.averageChildren * childStats.totalRings;
          }
        }

        return {
          totalRings,
          totalMembers,
          totalPosts,
          maxDepth,
          averageChildren: totalRings > 0 ? directChildrenSum / totalRings : 0
        };
      }
    };

    const stats = await calculateStats(root);

    return res.json({
      success: true,
      tree: root,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Genealogy API error:", error);
    return res.status(500).json({
      error: "Failed to fetch genealogy data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}