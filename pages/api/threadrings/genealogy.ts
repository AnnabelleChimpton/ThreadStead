import { apiHandler } from "@/lib/api/handler";
import { cached } from "@/lib/api/ringhub/ringhub-cache";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { readAsViewer } from "@/lib/rings/read-as-viewer";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";

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
  badgeImageUrl: string | null;
  themeColor: string | null;
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

/** How deep the tree goes: the page asks for 50; 3 when it isn't a number */
function depthLimit(raw: unknown): number {
  const depth = Number(raw ?? 3);
  return Number.isFinite(depth) ? Math.min(Math.max(Math.trunc(depth), 1), 50) : 3;
}

/**
 * Every ring under the root, as the viewer may see it (their private rings
 * too). Cached per viewer like lineage: from the Spool it's the hub walking
 * every ring, and it was read again on every view.
 */
export default apiHandler({ methods: ["GET"], auth: "optional" }, async (req, res, { user: viewer }) => {
  try {
    const rootSlug = typeof req.query.rootId === "string" && req.query.rootId ? req.query.rootId : "spool";
    const maxDepth = depthLimit(req.query.maxDepth);

    const publicClient = getPublicRingHubClient();
    const body = await cached(`ring-genealogy:${viewer?.id ?? "public"}:${rootSlug}:${maxDepth}`, 30_000, 5 * 60_000, async () => {
      // The tree as the viewer may see it: their private rings too
      const lineageData = await readAsViewer(
        viewer ? () => createAuthenticatedRingHubClient(viewer.id).getRingLineageAsMember(rootSlug) : null,
        () => publicClient.getRingLineage(rootSlug)
      );

      // Transform Ring Hub data to our format
      // `depth` is how many rings up the tree this one sits from the root shown
      const transformRingToNode = (ring: any, depth = 0): ThreadRingNode => {
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
          lineageDepth: depth,
          curatorHandle: null, // Will be resolved by transformers if needed
          createdAt: ring.createdAt || new Date().toISOString(),
          badgeImageUrl: ring.badgeImageUrl ?? null,
          themeColor: ring.themeColor ?? null,
          children: []
        };
      };

      // Build tree structure recursively
      const buildTreeStructure = (node: any, depth = 0): ThreadRingNode => {
        const transformedNode = transformRingToNode(node, depth);
        if (Array.isArray(node.children)) {
          transformedNode.children = node.children.map((child: unknown) => buildTreeStructure(child, depth + 1));
        }
        return transformedNode;
      };

      // Build the genealogy tree from Ring Hub data
      let root: ThreadRingNode;
      if (rootSlug === 'spool' && lineageData.descendants && lineageData.descendants.length > 0) {
        // For the spool, create a virtual root with all top-level rings as children
        const spoolRing = transformRingToNode(lineageData.ring);
        spoolRing.children = lineageData.descendants.map((desc) => buildTreeStructure(desc, 1));
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
        if (currentDepth >= maxDepth) {
          return { ...node, children: [] };
        }
        return {
          ...node,
          children: node.children?.map(child => pruneToDepth(child, currentDepth + 1)) || []
        };
      };

      root = pruneToDepth(root, 0);

      // Calculate statistics efficiently using Ring Hub stats endpoint
      const calculateStats = async (node: ThreadRingNode): Promise<GenealogyStats> => {
        try {
          // Ring Hub's network counts; the stats route and ring page share the key
          const ringHubStats = await cached("ring-hub-stats", 30_000, 5 * 60_000, () => publicClient.getStats());
        
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
      return { success: true, tree: root, stats };
    });

    return res.json({ ...body, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Genealogy API error:", error);
    return res.status(500).json({
      error: "Failed to fetch genealogy data"
    });
  }
});
