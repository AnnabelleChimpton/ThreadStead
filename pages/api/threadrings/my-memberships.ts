import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  try {
    // Use Ring Hub memberships when enabled
    if (featureFlags.ringhub()) {
      try {
        const authenticatedClient = createAuthenticatedRingHubClient(viewer.id);

        // Fetch all active memberships with pagination
        const allMemberships = [];
        let offset = 0;
        let hasMore = true;
        const limit = 50; // Fetch in batches of 50

        while (hasMore) {
          const response = await authenticatedClient.getMyMemberships({
            status: 'ACTIVE',
            limit,
            offset
          });

          allMemberships.push(...response.memberships);

          if (response.memberships.length < limit || !response.hasMore) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }

        // Transform Ring Hub memberships to ThreadStead format
        const rings = allMemberships.map(membership => ({
          id: membership.ringSlug, // Use slug as ID for Ring Hub rings
          name: membership.ringName,
          slug: membership.ringSlug,
          role: membership.role,
          visibility: membership.ringVisibility.toLowerCase(), // Convert to lowercase
        }));

        return res.status(200).json({ rings });
      } catch (error: any) {
        console.error('Failed to fetch Ring Hub memberships:', error);

        // Check if this is an authentication error for a new user
        if (error.status === 401 || error.message?.includes('Authentication required')) {
          console.log('User may not have Ring Hub identity yet, returning empty memberships');
          // This is expected for new users who haven't interacted with Ring Hub yet
          return res.status(200).json({ rings: [] });
        }

        // For other errors, still return empty array but log the issue
        console.error('Unexpected Ring Hub error:', error.message || error);
        return res.status(200).json({ rings: [] });
      }
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