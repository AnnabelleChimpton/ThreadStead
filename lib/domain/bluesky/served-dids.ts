/**
 * What /.well-known/atproto-did answers on each resident's host, held in
 * memory so the endpoint never waits on the database. Bluesky's resolver
 * gives up after 3 seconds and treats any error as "no handle", so the
 * endpoint has to be trivially cheap.
 *
 * The whole table is small (one row per linked resident), so it's loaded in
 * one query and reloaded when it's a minute old, or straight away after any
 * change in this process (linking, checking, unlinking, moderation). If a
 * reload fails, the last good copy keeps serving.
 *
 * A DID is served while the account is active and the link is verified, or
 * pending and not past pendingUntil.
 */
import { db } from '@/lib/config/database/connection';
import { activeUserWhere } from '@/lib/domain/users/moderation';

export const SNAPSHOT_TTL_MS = 60_000;

interface Served {
  did: string;
  /** Pending links stop at this time (ms); verified ones don't */
  until: number | null;
}

interface Snapshot {
  byLabel: Map<string, Served>;
  loadedAt: number;
}

interface State {
  snapshot: Snapshot | null;
  loading: { generation: number; promise: Promise<Snapshot> } | null;
  // Bumped by invalidate, so a load that started before a change can't
  // store (or hand out) what it read.
  generation: number;
}

// On globalThis: Next builds each API route as its own bundle, so a
// module-level copy would mean the settings route's invalidate never
// reaches the endpoint's copy.
const globalForDids = globalThis as unknown as { __blueskyServedDids?: State };
const state: State = (globalForDids.__blueskyServedDids ??= { snapshot: null, loading: null, generation: 0 });

async function load(now: Date): Promise<Snapshot> {
  const rows = await db.blueskyHandleLink.findMany({
    where: {
      OR: [{ status: 'verified' }, { status: 'pending', pendingUntil: { gt: now } }],
      user: { ...activeUserWhere(now), subdomainLabel: { not: null } },
    },
    select: { did: true, status: true, pendingUntil: true, user: { select: { subdomainLabel: true } } },
  });
  const byLabel = new Map<string, Served>();
  for (const row of rows) {
    const label = row.user.subdomainLabel;
    if (!label) continue;
    byLabel.set(label, {
      did: row.did,
      until: row.status === 'pending' && row.pendingUntil ? row.pendingUntil.getTime() : null,
    });
  }
  return { byLabel, loadedAt: now.getTime() };
}

function refresh(now: Date): Promise<Snapshot> {
  if (state.loading?.generation === state.generation) return state.loading.promise;
  const started = state.generation;
  const promise = load(now)
    .then((fresh) => {
      if (started === state.generation) state.snapshot = fresh;
      return fresh;
    })
    .finally(() => {
      if (state.loading?.promise === promise) state.loading = null;
    });
  state.loading = { generation: started, promise };
  return promise;
}

/** The DID to serve for an address label, or null for a 404. */
export async function servedDidFor(label: string, now = new Date()): Promise<string | null> {
  let current = state.snapshot;
  if (!current || now.getTime() - current.loadedAt >= SNAPSHOT_TTL_MS) {
    try {
      current = await refresh(now);
    } catch (error) {
      if (!current) throw error;
      console.error('Bluesky handles: reload failed, serving the last copy', error);
    }
  }
  const served = current.byLabel.get(label);
  if (!served) return null;
  if (served.until !== null && served.until <= now.getTime()) return null;
  return served.did;
}

/** Forget the copy in memory; the next request loads a fresh one. */
export function invalidateServedDids(): void {
  state.generation += 1;
  state.snapshot = null;
}
