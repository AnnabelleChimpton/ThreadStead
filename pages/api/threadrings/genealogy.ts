import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";

const prisma = new PrismaClient();

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

    // Get all ThreadRings with their relationships
    const allRings = await prisma.threadRing.findMany({
      where: {
        // Only show public rings or rings the viewer is a member of
        OR: [
          { visibility: "public" },
          ...(viewer ? [
            {
              members: {
                some: {
                  userId: viewer.id
                }
              }
            }
          ] : [])
        ]
      },
      include: {
        curator: {
          select: {
            primaryHandle: true
          }
        },
        _count: {
          select: {
            members: true,
            posts: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Build a map for quick lookups
    const ringMap = new Map<string, ThreadRingNode>();
    const childrenMap = new Map<string, ThreadRingNode[]>();

    // First pass: Create all nodes
    for (const ring of allRings) {
      const node: ThreadRingNode = {
        id: ring.id,
        name: ring.name,
        slug: ring.slug,
        description: ring.description,
        memberCount: ring._count.members,
        postCount: ring._count.posts,
        directChildrenCount: ring.directChildrenCount,
        totalDescendantsCount: ring.totalDescendantsCount,
        lineageDepth: ring.lineageDepth,
        curatorHandle: ring.curator?.primaryHandle || null,
        createdAt: ring.createdAt.toISOString(),
        children: []
      };
      ringMap.set(ring.id, node);

      // Track parent-child relationships
      if (ring.parentId) {
        if (!childrenMap.has(ring.parentId)) {
          childrenMap.set(ring.parentId, []);
        }
        childrenMap.get(ring.parentId)!.push(node);
      }
    }

    // Second pass: Build the tree structure
    for (const [parentId, children] of childrenMap.entries()) {
      const parent = ringMap.get(parentId);
      if (parent) {
        parent.children = children.sort((a, b) => {
          // Sort by descendant count (most descendants first), then by name
          if (b.totalDescendantsCount !== a.totalDescendantsCount) {
            return b.totalDescendantsCount - a.totalDescendantsCount;
          }
          return a.name.localeCompare(b.name);
        });
      }
    }

    // Find the root (The Spool or specified root)
    let root: ThreadRingNode | undefined;
    
    if (rootId && typeof rootId === 'string') {
      root = ringMap.get(rootId);
    } else {
      // Find The Spool (system ring)
      const spool = allRings.find(r => r.isSystemRing);
      if (spool) {
        root = ringMap.get(spool.id);
      }
    }

    // If we still don't have a root, find rings with no parent
    if (!root) {
      const orphans = allRings.filter(r => !r.parentId);
      if (orphans.length > 0) {
        // Create a virtual root if there are multiple orphans
        if (orphans.length === 1) {
          root = ringMap.get(orphans[0].id);
        } else {
          root = {
            id: 'virtual-root',
            name: 'ThreadRings',
            slug: 'threadrings',
            description: 'All ThreadRing communities',
            memberCount: 0,
            postCount: 0,
            directChildrenCount: orphans.length,
            totalDescendantsCount: allRings.length,
            lineageDepth: 0,
            curatorHandle: null,
            createdAt: new Date().toISOString(),
            children: orphans.map(o => ringMap.get(o.id)!).filter(Boolean)
          };
        }
      }
    }

    // Prune tree to maxDepth if specified
    const pruneToDepth = (node: ThreadRingNode, currentDepth: number): ThreadRingNode => {
      if (currentDepth >= Number(maxDepth)) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: node.children?.map(child => pruneToDepth(child, currentDepth + 1)) || []
      };
    };

    if (root && maxDepth) {
      root = pruneToDepth(root, 0);
    }

    // Calculate statistics
    const stats = {
      totalRings: allRings.length,
      totalMembers: allRings.reduce((sum, r) => sum + r.memberCount, 0),
      totalPosts: allRings.reduce((sum, r) => sum + r.postCount, 0),
      maxDepth: Math.max(...allRings.map(r => r.lineageDepth)),
      averageChildren: allRings.length > 0 
        ? allRings.reduce((sum, r) => sum + r.directChildrenCount, 0) / allRings.length 
        : 0
    };

    return res.json({
      success: true,
      tree: root || null,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Genealogy API error:", error);
    return res.status(500).json({
      error: "Failed to fetch genealogy data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await prisma.$disconnect();
  }
}