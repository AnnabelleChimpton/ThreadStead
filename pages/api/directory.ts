import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { SITE_NAME } from "@/lib/site-config";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));
    const search = String(req.query.search || "").trim();
    const sortBy = String(req.query.sortBy || "recent"); // recent, alphabetical, posts

    // Build where clause for search
    const whereClause: any = {
      handles: {
        some: {
          host: SITE_NAME
        }
      }
    };

    if (search) {
      whereClause.OR = [
        {
          handles: {
            some: {
              handle: {
                contains: search,
                mode: "insensitive"
              },
              host: SITE_NAME
            }
          }
        },
        {
          profile: {
            displayName: {
              contains: search,
              mode: "insensitive"
            }
          }
        },
        {
          profile: {
            bio: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      ];
    }

    // Build order clause
    let orderBy: any = { createdAt: "desc" }; // default: recent
    
    if (sortBy === "alphabetical") {
      orderBy = {
        handles: {
          _count: "desc" // This is a workaround - we'll sort by handle in JS
        }
      };
    } else if (sortBy === "posts") {
      orderBy = {
        posts: {
          _count: "desc"
        }
      };
    }

    const users = await db.user.findMany({
      where: whereClause,
      include: {
        handles: {
          where: { host: "local" },
          take: 1,
          orderBy: { handle: "asc" }
        },
        profile: {
          select: {
            displayName: true,
            bio: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            posts: {
              where: {
                visibility: "public"
              }
            },
            followers: true,
            following: true
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset
    });

    // Transform and filter users who have local handles
    const transformedUsers = users
      .filter(user => user.handles.length > 0)
      .map(user => ({
        id: user.id,
        username: user.handles[0]?.handle || null,
        displayName: user.profile?.displayName || null,
        bio: user.profile?.bio || null,
        avatarUrl: user.profile?.avatarUrl || null,
        createdAt: user.createdAt,
        postCount: user._count.posts,
        followerCount: user._count.followers,
        followingCount: user._count.following
      }));

    // Sort alphabetically if requested (since Prisma doesn't handle this well with relations)
    if (sortBy === "alphabetical") {
      transformedUsers.sort((a, b) => {
        const nameA = (a.displayName || a.username || "").toLowerCase();
        const nameB = (b.displayName || b.username || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    // Get total count for pagination
    const totalUsers = await db.user.count({
      where: whereClause
    });

    return res.json({
      users: transformedUsers,
      hasMore: offset + transformedUsers.length < totalUsers,
      total: totalUsers
    });

  } catch (error) {
    console.error("Error fetching directory:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}