import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { filterBlockedUsers } from "@/lib/threadring-blocks";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const ring = await db.threadRing.findUnique({
      where: { slug },
      include: {
        curator: {
          select: {
            id: true,
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
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
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
            },
          },
          orderBy: [
            { role: "desc" }, // Curator first, then moderators, then members
            { joinedAt: "asc" },
          ],
        },
      },
    });

    if (!ring) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Filter out blocked users from member list
    if (ring.members.length > 0) {
      const memberUserIds = ring.members.map(member => member.user.id);
      const allowedUserIds = await filterBlockedUsers(ring.id, memberUserIds);
      ring.members = ring.members.filter(member => allowedUserIds.includes(member.user.id));
    }

    res.status(200).json({ ring });
  } catch (error: any) {
    console.error("ThreadRing fetch error:", error);
    res.status(500).json({ error: "Failed to fetch ThreadRing" });
  }
}