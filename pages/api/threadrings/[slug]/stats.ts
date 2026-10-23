import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { withThreadRingSupport } from "@/lib/api/ringhub/ringhub-middleware";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { cached } from "@/lib/api/ringhub/ringhub-cache";
import { mapDIDsToUserIds } from "@/lib/api/did/server-did-client";
import { usernameFromHandle } from "@/lib/domain/notifications/links";
import { visibleResidentWhere } from "@/lib/domain/users/profile-access";
import { readAsViewer } from "@/lib/rings/read-as-viewer";

const FRESH_MS = 30_000;
const STALE_MS = 5 * 60_000;

type Leader = { actorDid: string; actorName: string | null };
/** Someone who looks after the ring; `username` when they live here and the viewer may see them. */
type Person = { username: string | null; displayName: string };

/** Hub DIDs to the residents behind them, leaving out anyone hidden from the viewer. */
async function people(leaders: Leader[], viewerId: string | null): Promise<Person[]> {
  if (leaders.length === 0) return [];
  const userIds = await mapDIDsToUserIds(leaders.map((leader) => leader.actorDid));
  const users = await db.user.findMany({
    where: { AND: [{ id: { in: [...new Set(userIds.values())] } }, visibleResidentWhere(viewerId)] },
    select: { id: true, primaryHandle: true, profile: { select: { displayName: true } } },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  return leaders.flatMap((leader) => {
    const userId = userIds.get(leader.actorDid);
    if (!userId) return [{ username: null, displayName: leader.actorName || "Ring Hub member" }];
    const user = byId.get(userId);
    if (!user) return [];
    const username = usernameFromHandle(user.primaryHandle);
    return [{ username, displayName: user.profile?.displayName || username || "Member" }];
  });
}

/**
 * A ring's numbers, only the ones the hub keeps: members, posts, and who
 * hosts and moderates it.
 */
export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const publicClient = system === 'ringhub' ? getPublicRingHubClient() : null;
  if (!publicClient) {
    return res.status(503).json({ error: 'hub_unavailable', degraded: true });
  }

  const viewer = await getSessionUser(req);
  let ring;
  try {
    ring = await readAsViewer(
      viewer ? () => createAuthenticatedRingHubClient(viewer.id).getRingAsMember(slug) : null,
      async () => {
        const kept = await cached(`ring:${slug}`, FRESH_MS, STALE_MS, () => publicClient.getRing(slug));
        // Read for someone who may be a member; unsigned, a private ring isn't there
        return kept?.visibility === 'PRIVATE' ? null : kept;
      }
    );
  } catch (error) {
    console.error('Ring Hub unavailable for stats:', error);
    return res.status(503).json({ error: 'hub_unavailable', degraded: true });
  }
  if (!ring) {
    return res.status(404).json({ error: "Ring not found" });
  }

  let host: Person | null = null;
  let moderators: Person[] = [];
  try {
    const info = await cached(`membership-info:${slug}`, FRESH_MS, STALE_MS, () => publicClient.getRingMembershipInfo(slug));
    // The hub leaves the owner out of `moderators`
    host = info.owner ? (await people([info.owner], viewer?.id ?? null))[0] ?? null : null;
    moderators = await people(info.moderators, viewer?.id ?? null);
  } catch (error) {
    // The counts still stand without who looks after it
    console.warn(`No membership info for ${slug}:`, error);
  }

  return res.json({ memberCount: ring.memberCount, postCount: ring.postCount, host, moderators });
});
