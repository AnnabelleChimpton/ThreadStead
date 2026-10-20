/**
 * The rings a page's owner is in, for <MyRings /> and <RingNav />.
 *
 * Ring membership lives on RingHub; ThreadStead keeps no copy of who is in a
 * ring (pages/api/threadrings/[slug]/join.ts writes no local row when the hub
 * is on). So these components read the same thing the profile's Badges tab,
 * <ProfileBadges /> and the pixel home page already read, in the browser after
 * the page loads: GET /api/users/<handle>/badges. That route checks the
 * profile's visibility and blocks, and keeps the hub's answer in its SWR
 * cache, so a page with these components adds no hub call of its own and
 * nothing to the server render. The page renders nothing in their place
 * until the list arrives, and nothing at all when the hub doesn't answer.
 *
 * One request per owner, shared by every component on the page.
 */
import { useEffect, useState } from 'react';

export interface OwnerRing {
  slug: string;
  name: string;
  visibility: 'public' | 'unlisted' | 'private';
}

/** How long one page keeps a list before asking again (same order as the route's own cache). */
const KEEP_MS = 60_000;

const lists = new Map<string, { at: number; rings: Promise<OwnerRing[] | null> }>();

function parse(data: unknown): OwnerRing[] | null {
  const badges = (data as { badges?: unknown } | null)?.badges;
  if (!Array.isArray(badges)) return null;
  const seen = new Map<string, OwnerRing>();
  for (const badge of badges) {
    const ring = (badge as { threadRing?: Record<string, unknown> } | null)?.threadRing;
    if (!ring || typeof ring.slug !== 'string' || !ring.slug) continue;
    const visibility = ring.visibility === 'public' || ring.visibility === 'unlisted' ? ring.visibility : 'private';
    const name = typeof ring.name === 'string' && ring.name.trim() ? ring.name : ring.slug;
    if (!seen.has(ring.slug)) seen.set(ring.slug, { slug: ring.slug, name, visibility });
  }
  return [...seen.values()];
}

/** The owner's rings, or null when they can't be had right now. Never rejects. */
export function loadOwnerRings(handle: string): Promise<OwnerRing[] | null> {
  const key = handle.toLowerCase();
  const kept = lists.get(key);
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.rings;
  const rings = Promise.resolve()
    .then(() => fetch(`/api/users/${encodeURIComponent(handle)}/badges`))
    .then((r) => (r.ok ? r.json() : null))
    .then(parse)
    .catch(() => null)
    .then((result) => {
      // A failed read isn't kept, so the next page asks again
      if (result === null) lists.delete(key);
      return result;
    });
  lists.set(key, { at: Date.now(), rings });
  return rings;
}

/** For tests */
export function forgetOwnerRings(): void {
  lists.clear();
}

/**
 * The owner's rings a page may list: public and unlisted ones (a private
 * ring's page is closed to visitors, so it isn't linked). null while loading
 * or when the hub can't be reached; the server render is always null.
 */
export function useOwnerRings(handle: string | undefined): OwnerRing[] | null {
  const [rings, setRings] = useState<OwnerRing[] | null>(null);
  useEffect(() => {
    if (!handle) return;
    let current = true;
    loadOwnerRings(handle).then((list) => {
      if (current) setRings(list ? list.filter((r) => r.visibility !== 'private') : null);
    });
    return () => {
      current = false;
    };
  }, [handle]);
  return rings;
}

/** A ring page's address */
export function ringPath(slug: string): string {
  return `/tr/${encodeURIComponent(slug)}`;
}
