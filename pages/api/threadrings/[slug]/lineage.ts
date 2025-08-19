import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { id: true, name: true }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Get parent (if this is a fork)
    const parentFork = await db.threadRingFork.findUnique({
      where: { childId: threadRing.id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            visibility: true,
            memberCount: true,
            postCount: true,
          }
        },
        createdByUser: {
          include: {
            handles: {
              select: {
                handle: true,
                host: true,
              },
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        }
      }
    });

    // Get children (forks of this ring) - only public/unlisted ones
    const childForks = await db.threadRingFork.findMany({
      where: {
        parentId: threadRing.id,
        child: {
          visibility: {
            in: ["public", "unlisted"]
          }
        }
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            visibility: true,
            memberCount: true,
            postCount: true,
            createdAt: true
          }
        },
        createdByUser: {
          include: {
            handles: {
              select: {
                handle: true,
                host: true,
              },
            },
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Transform parent data
    const parent = parentFork ? {
      id: parentFork.id,
      createdAt: parentFork.createdAt,
      threadRing: parentFork.parent,
      createdBy: {
        handle: parentFork.createdByUser.handles.find(h => h.host === "local")?.handle || 
                parentFork.createdByUser.handles[0]?.handle || 
                "unknown",
        displayName: parentFork.createdByUser.profile?.displayName,
        avatarUrl: parentFork.createdByUser.profile?.avatarUrl
      }
    } : null;

    // Transform children data
    const children = childForks.map(fork => {
      const creatorHandle = fork.createdByUser.handles.find(h => h.host === "local")?.handle || 
                           fork.createdByUser.handles[0]?.handle || 
                           "unknown";
      
      return {
        id: fork.id,
        createdAt: fork.createdAt,
        threadRing: fork.child,
        createdBy: {
          handle: creatorHandle,
          displayName: fork.createdByUser.profile?.displayName,
          avatarUrl: fork.createdByUser.profile?.avatarUrl
        }
      };
    });

    return res.json({ 
      parent,
      children,
      ringName: threadRing.name
    });

  } catch (error) {
    console.error("Error fetching ThreadRing lineage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}