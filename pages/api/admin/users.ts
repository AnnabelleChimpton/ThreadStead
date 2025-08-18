import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { requireAdmin } from "@/lib/auth-server";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      const users = await db.user.findMany({
        include: {
          handles: true,
          profile: {
            select: {
              displayName: true,
            },
          },
          _count: {
            select: {
              posts: true,
              comments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedUsers = users.map(user => ({
        id: user.id,
        did: user.did,
        role: user.role,
        createdAt: user.createdAt,
        displayName: user.profile?.displayName || null,
        primaryHandle: user.primaryHandle,
        handles: user.handles.map(h => `${h.handle}@${h.host}`),
        postCount: user._count.posts,
        commentCount: user._count.comments,
      }));

      res.json({ users: formattedUsers });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}