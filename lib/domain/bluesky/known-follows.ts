/**
 * "People you already know here": residents a newly connected resident
 * already follows on Bluesky. Shown only in Settings → Bluesky, once their
 * own link is verified. Nothing is stored: their follows come from
 * Bluesky's public API on demand (kept in memory for a few minutes), and
 * the people matched aren't told.
 *
 * A match is someone with a verified Bluesky link whose DID they follow,
 * who's an active resident they're allowed to see (visibleResidentWhere:
 * visibility, suspensions, blocks either way), and whom they don't already
 * follow here.
 */
import { db } from '@/lib/config/database/connection';
import { visibleResidentWhere } from '@/lib/domain/users/profile-access';
import { BSKY_PUBLIC_API, defaultFetcher, type Fetcher } from './atproto';

export const MAX_FOLLOW_PAGES = 10;
const PAGE_SIZE = 100;
export const MAX_PEOPLE = 30;
const CACHE_MS = 10 * 60 * 1000;
// A failed lookup is remembered briefly too, so a reload doesn't hammer Bluesky
const FAILURE_CACHE_MS = 60 * 1000;

export interface KnownPerson {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

type Cached = { dids: string[] | null; expires: number };
const globalForFollows = globalThis as unknown as { __blueskyFollowsCache?: Map<string, Cached> };
const cache: Map<string, Cached> = (globalForFollows.__blueskyFollowsCache ??= new Map());

/**
 * The DIDs an account follows on Bluesky, up to 10 pages (1,000 follows).
 * Null when Bluesky didn't answer properly: the caller shows nothing.
 */
export async function fetchBlueskyFollows(did: string, fetcher: Fetcher = defaultFetcher): Promise<string[] | null> {
  const dids: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_FOLLOW_PAGES; page++) {
    const params = new URLSearchParams({ actor: did, limit: String(PAGE_SIZE) });
    if (cursor) params.set('cursor', cursor);
    let body: { follows?: unknown; cursor?: unknown } | null;
    try {
      const response = await fetcher(`${BSKY_PUBLIC_API}/xrpc/app.bsky.graph.getFollows?${params}`);
      if (!response.ok) return null;
      body = await response.json();
    } catch {
      return null;
    }
    if (!body || !Array.isArray(body.follows)) return null;
    for (const follow of body.follows) {
      const followDid = (follow as { did?: unknown })?.did;
      if (typeof followDid === 'string' && followDid.startsWith('did:')) dids.push(followDid.toLowerCase());
    }
    cursor = typeof body.cursor === 'string' && body.cursor ? body.cursor : undefined;
    if (!cursor || body.follows.length === 0) break;
  }
  return [...new Set(dids)];
}

async function followsFor(did: string, fetcher: Fetcher, now: number): Promise<string[] | null> {
  const hit = cache.get(did);
  if (hit && hit.expires > now) return hit.dids;
  const dids = await fetchBlueskyFollows(did, fetcher);
  cache.set(did, { dids, expires: now + (dids ? CACHE_MS : FAILURE_CACHE_MS) });
  return dids;
}

/** Forget what's in memory (tests). */
export function clearBlueskyFollowsCache(): void {
  cache.clear();
}

/**
 * The residents this viewer follows on Bluesky, or [] (no verified link of
 * their own, nobody matched, or Bluesky didn't answer).
 */
export async function knownPeopleHere(
  viewerId: string,
  { fetcher = defaultFetcher, now = Date.now() }: { fetcher?: Fetcher; now?: number } = {}
): Promise<KnownPerson[]> {
  const own = await db.blueskyHandleLink.findUnique({ where: { userId: viewerId }, select: { did: true, status: true } });
  if (!own || own.status !== 'verified') return [];

  const followed = await followsFor(own.did, fetcher, now);
  if (!followed || followed.length === 0) return [];

  const matches = await db.blueskyHandleLink.findMany({
    where: {
      status: 'verified',
      did: { in: followed },
      userId: { not: viewerId },
      user: {
        AND: [
          visibleResidentWhere(viewerId),
          { primaryHandle: { not: null } },
          // Any follow row, a pending request included: they've already asked
          { followers: { none: { followerId: viewerId } } },
        ],
      },
    },
    select: {
      user: { select: { primaryHandle: true, profile: { select: { displayName: true, avatarUrl: true } } } },
    },
    orderBy: { verifiedAt: 'desc' },
    take: MAX_PEOPLE,
  });

  return matches.flatMap(({ user }) => {
    const username = user.primaryHandle?.split('@')[0];
    if (!username) return [];
    return [{ username, displayName: user.profile?.displayName || null, avatarUrl: user.profile?.avatarUrl || null }];
  });
}
