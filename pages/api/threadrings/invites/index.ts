import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
    const offset = parseInt(String(req.query.offset || "0"));
    const status = String(req.query.status || "pending");

    // Validate status
    if (!["pending", "accepted", "declined", "revoked"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Fetch invites for the current user
    const invites = await db.threadRingInvite.findMany({
      where: {
        inviteeId: viewer.id,
        status: status as any
      },
      include: {
        threadRing: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            visibility: true,
            joinType: true,
            memberCount: true,
            postCount: true
          }
        },
        inviter: {
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
    const transformedInvites = invites.map(invite => {
      const inviterHandle = invite.inviter.handles.find(h => h.host === "local")?.handle || 
                           invite.inviter.handles[0]?.handle || 
                           "unknown";
      
      return {
        id: invite.id,
        status: invite.status,
        createdAt: invite.createdAt,
        threadRing: invite.threadRing,
        inviter: {
          handle: inviterHandle,
          displayName: invite.inviter.profile?.displayName,
          avatarUrl: invite.inviter.profile?.avatarUrl
        }
      };
    });

    return res.json({ 
      invites: transformedInvites,
      hasMore: invites.length === limit 
    });

  } catch (error) {
    console.error("Error fetching ThreadRing invites:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}