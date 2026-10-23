import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { cached } from "@/lib/api/ringhub/ringhub-cache";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  try {
    const authenticatedClient = createAuthenticatedRingHubClient(viewer.id);

    // Fetch all active memberships with pagination, wrapped in the SWR cache so
    // a transient hub blip serves the last-known list instead of "no rings".
    const rings = await cached(
      `my-memberships:${viewer.id}`,
      30_000, // fresh for 30s
      5 * 60_000, // serve stale up to 5min while refreshing
      async () => {
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

        // Transform Ring Hub memberships to ThreadStead format, A to Z
        return allMemberships
          .map(membership => ({
            id: membership.ringSlug, // Use slug as ID for Ring Hub rings
            name: membership.ringName,
            slug: membership.ringSlug,
            role: membership.role,
            visibility: membership.ringVisibility.toLowerCase(), // Convert to lowercase
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    );

    return res.status(200).json({ rings });
  } catch (error: any) {
    // Auth failure here means a stale/unregistered user key, NOT "no memberships".
    // Surface it as a degraded signal so the UI can distinguish it from empty.
    if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
      console.error('Ring Hub unavailable for my-memberships:', error.name, error.message);
      return res.status(503).json({ error: 'hub_unavailable', degraded: true });
    }

    console.error('Failed to fetch Ring Hub memberships:', error);
    return res.status(503).json({ error: 'hub_unavailable', degraded: true });
  }
}