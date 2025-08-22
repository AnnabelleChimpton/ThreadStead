import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { featureFlags } from "@/lib/feature-flags";
import { getRingHubClient } from "@/lib/ringhub-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  try {
    // For Ring Hub, we don't have local membership data, so return empty for now
    // TODO: Implement Ring Hub membership tracking when user authentication is available
    if (featureFlags.ringhub()) {
      // When Ring Hub is enabled, local memberships may not be available
      // Return empty list for now - this will need proper implementation when
      // Ring Hub supports user authentication and membership tracking
      return res.status(200).json({ rings: [] });
    }

    const memberships = await db.threadRingMember.findMany({
      where: { userId: viewer.id },
      include: {
        threadRing: {
          select: {
            id: true,
            name: true,
            slug: true,
            visibility: true,
          },
        },
      },
      orderBy: [
        { role: "desc" }, // Curated rings first
        { threadRing: { name: "asc" } }, // Then alphabetical
      ],
    });

    const rings = memberships.map(membership => ({
      id: membership.threadRing.id,
      name: membership.threadRing.name,
      slug: membership.threadRing.slug,
      role: membership.role,
      visibility: membership.threadRing.visibility,
    }));

    res.status(200).json({ rings });
  } catch (error: any) {
    console.error("ThreadRing memberships fetch error:", error);
    res.status(500).json({ error: "Failed to fetch ThreadRing memberships" });
  }
}