import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";

const prisma = new PrismaClient();

interface CompactThreadRingNode {
  id: string;
  n: string;  // name (shortened key)
  s: string;  // slug
  d: number;  // directChildrenCount
  t: number;  // totalDescendantsCount
  p?: string; // parentId (optional)
  c?: CompactThreadRingNode[]; // children (optional)
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
    const { 
      maxDepth = 2,  // Default to shallow depth
      expandPath     // Comma-separated IDs to expand
    } = req.query;

    // Parse expand path if provided
    const expandIds = expandPath 
      ? String(expandPath).split(',').filter(Boolean) 
      : [];

    // Strategy 1: Limit initial depth for large trees
    const depthLimit = Math.min(Number(maxDepth), 3);

    // Strategy 2: For very deep paths, only load the path + siblings
    if (expandIds.length > 0) {
      // Load specific path with siblings at each level
      const pathRings = await prisma.threadRing.findMany({
        where: {
          OR: [
            // The expanded path
            { id: { in: expandIds } },
            // Siblings of expanded nodes
            { parentId: { in: expandIds } },
            // The root
            { isSystemRing: true }
          ],
          AND: [
            // Privacy filter
            {
              OR: [
                { visibility: "public" },
                ...(viewer ? [{
                  members: {
                    some: { userId: viewer.id }
                  }
                }] : [])
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          directChildrenCount: true,
          totalDescendantsCount: true,
          lineageDepth: true,
          isSystemRing: true
        }
      });

      // Build compact tree
      const tree = buildCompactTree(pathRings);
      
      return res.json({
        success: true,
        tree,
        expandedPath: expandIds,
        totalNodes: pathRings.length,
        compact: true
      });
    }

    // Strategy 3: For initial load, only load to shallow depth
    const rings = await prisma.threadRing.findMany({
      where: {
        AND: [
          // Depth limit for initial load
          { lineageDepth: { lte: depthLimit } },
          // Privacy filter
          {
            OR: [
              { visibility: "public" },
              ...(viewer ? [{
                members: {
                  some: { userId: viewer.id }
                }
              }] : [])
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        directChildrenCount: true,
        totalDescendantsCount: true,
        lineageDepth: true,
        isSystemRing: true
      },
      // Limit total results for safety
      take: 500
    });

    // Get total count for stats
    const totalCount = await prisma.threadRing.count({
      where: {
        OR: [
          { visibility: "public" },
          ...(viewer ? [{
            members: {
              some: { userId: viewer.id }
            }
          }] : [])
        ]
      }
    });

    const tree = buildCompactTree(rings);
    
    // Strategy 4: Add metadata about what's not loaded
    const stats = {
      loadedNodes: rings.length,
      totalNodes: totalCount,
      maxDepthLoaded: depthLimit,
      hasMore: totalCount > rings.length
    };

    return res.json({
      success: true,
      tree,
      stats,
      compact: true
    });

  } catch (error) {
    console.error("Optimized genealogy API error:", error);
    return res.status(500).json({
      error: "Failed to fetch genealogy data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await prisma.$disconnect();
  }
}

function buildCompactTree(rings: any[]): CompactThreadRingNode | null {
  const nodeMap = new Map<string, CompactThreadRingNode>();
  const childrenMap = new Map<string, CompactThreadRingNode[]>();

  // First pass: Create compact nodes
  for (const ring of rings) {
    const node: CompactThreadRingNode = {
      id: ring.id,
      n: ring.name,
      s: ring.slug,
      d: ring.directChildrenCount,
      t: ring.totalDescendantsCount
    };
    
    if (ring.parentId) {
      node.p = ring.parentId;
    }
    
    nodeMap.set(ring.id, node);

    // Track parent-child relationships
    if (ring.parentId) {
      if (!childrenMap.has(ring.parentId)) {
        childrenMap.set(ring.parentId, []);
      }
      childrenMap.get(ring.parentId)!.push(node);
    }
  }

  // Second pass: Build tree structure
  for (const [parentId, children] of childrenMap.entries()) {
    const parent = nodeMap.get(parentId);
    if (parent) {
      // Only add children array if there are children
      if (children.length > 0) {
        parent.c = children.sort((a, b) => b.t - a.t); // Sort by descendants
      }
    }
  }

  // Find root
  const root = rings.find(r => r.isSystemRing);
  return root ? nodeMap.get(root.id) || null : null;
}