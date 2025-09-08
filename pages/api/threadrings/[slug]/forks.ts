import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

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
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));

    // Find the ThreadRing
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: { id: true, name: true, visibility: true }
    });

    if (!threadRing) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Get forks of this ThreadRing (only public/unlisted ones)
    const forks = await db.threadRingFork.findMany({
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
            joinType: true,
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
      },
      take: limit,
      skip: offset
    });

    // Transform the data for the response
    const transformedForks = forks.map(fork => {
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
      forks: transformedForks,
      hasMore: forks.length === limit,
      parent: {
        name: threadRing.name,
        slug: slug
      }
    });

  } catch (error) {
    console.error("Error fetching ThreadRing forks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}