/**
 * Small in-process TTL cache with stale-while-revalidate for Ring Hub READS.
 *
 * Single-server deployment (server.js), so a module-level Map is safe and shared
 * across requests. This layer NEVER throws on its own: if the underlying fetch
 * fails and we hold a stale value, we return the stale value; only when there is
 * nothing cached at all do we rethrow the fetch error to the caller.
 *
 * Semantics of `cached(key, ttlMs, staleMs, fetchFn)`:
 *   - Fresh   (age <= ttlMs):            return cached value immediately.
 *   - Stale   (ttlMs < age <= staleMs):  return cached value immediately AND kick
 *                                        off a background refresh (deduped).
 *   - Expired (age > staleMs) or missing: await fetchFn and cache the result.
 *
 * Wall-clock ages are relative to the last successful fetch.
 */

interface CacheEntry<T> {
  value: T;
  storedAt: number; // ms epoch of last successful fetch
}

const MAX_ENTRIES = 1000;

// Module-level store. Map preserves insertion order, which we use for oldest-first eviction.
const store = new Map<string, CacheEntry<unknown>>();

// Track in-flight background refreshes so we don't stampede the hub for the same key.
const refreshing = new Set<string>();

function evictIfNeeded(): void {
  while (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

function setEntry<T>(key: string, value: T): void {
  // Delete-then-set so the key moves to the most-recent insertion slot.
  store.delete(key);
  store.set(key, { value, storedAt: Date.now() });
  evictIfNeeded();
}

/**
 * Fire a background refresh for a stale key. Never rejects to the caller; on
 * failure we keep the existing stale entry so the next read can serve it.
 */
function backgroundRefresh<T>(key: string, fetchFn: () => Promise<T>): void {
  if (refreshing.has(key)) return;
  refreshing.add(key);
  // Intentionally not awaited.
  void (async () => {
    try {
      const value = await fetchFn();
      setEntry(key, value);
    } catch {
      // Keep the stale entry; swallow the error so background work never throws.
    } finally {
      refreshing.delete(key);
    }
  })();
}

/**
 * Cache a Ring Hub read with stale-while-revalidate.
 *
 * @param key     Stable cache key (include any params that vary the result).
 * @param ttlMs   Freshness window; within this, the cached value is returned as-is.
 * @param staleMs Stale window (>= ttlMs); within this, cached value is returned and
 *                a background refresh is triggered.
 * @param fetchFn Loader that hits the hub. May throw typed Ring Hub errors.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  staleMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry) {
    const age = Date.now() - entry.storedAt;
    if (age <= ttlMs) {
      return entry.value;
    }
    if (age <= staleMs) {
      // Serve stale immediately, refresh in the background.
      backgroundRefresh(key, fetchFn);
      return entry.value;
    }
    // Expired: try to refresh, but fall back to the (very) stale value on failure
    // rather than throwing when we have something to serve.
    try {
      const value = await fetchFn();
      setEntry(key, value);
      return value;
    } catch (error) {
      return entry.value;
    }
  }

  // Nothing cached: await the fetch. If it throws, the error propagates (the cache
  // layer itself adds no error) so callers can render a degraded state.
  const value = await fetchFn();
  setEntry(key, value);
  return value;
}

/** Remove a single key (e.g. after a write invalidates a read). Test/maintenance helper. */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Clear the entire cache. Primarily for tests. */
export function clearCache(): void {
  store.clear();
  refreshing.clear();
}
