/**
 * In-process cache in front of runExtSearch.
 *
 * Every uncached external search can spend paid Brave quota, and the same
 * handful of queries (and the 60 Surprise discovery query/page combos) come
 * up again and again. Entries live 30 minutes (2 when an engine failed, so a
 * flaky engine gets retried soon); identical concurrent requests share one
 * upstream call. Per process, so each pm2 worker has its own — fine at this
 * size.
 */
import { runExtSearch } from './registry';
import type { ExtSearchQuery, ExtSearchResponse } from './types';

type RunOptions = Parameters<typeof runExtSearch>[1];

export const EXTSEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
export const EXTSEARCH_PARTIAL_TTL_MS = 2 * 60 * 1000;
export const EXTSEARCH_CACHE_MAX_ENTRIES = 500;

interface Entry {
  value: ExtSearchResponse;
  expiresAt: number;
}

/** Map keeps insertion order, so the first key is the least recently used. */
const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<ExtSearchResponse>>();

export function normaliseQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function extSearchCacheKey(query: ExtSearchQuery, options?: RunOptions): string {
  return JSON.stringify([
    normaliseQuery(query.q),
    query.page ?? 0,
    query.perPage ?? null,
    query.category ?? null,
    query.safeSearch ?? null,
    query.siteScope ?? null,
    options?.enabledEngines ? [...options.enabledEngines].sort() : null,
    options?.filters ?? null,
    options?.boost ?? null,
  ]);
}

function get(key: string): ExtSearchResponse | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return undefined;
  }
  // Refresh recency.
  entries.delete(key);
  entries.set(key, entry);
  return entry.value;
}

function set(key: string, value: ExtSearchResponse, ttlMs: number): void {
  entries.delete(key);
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (entries.size > EXTSEARCH_CACHE_MAX_ENTRIES) {
    entries.delete(entries.keys().next().value as string);
  }
}

export async function cachedExtSearch(
  query: ExtSearchQuery,
  options?: RunOptions
): Promise<ExtSearchResponse> {
  const key = extSearchCacheKey(query, options);

  const hit = get(key);
  if (hit) return { ...hit, meta: { ...hit.meta, cacheHit: true } };

  const pending = inflight.get(key);
  if (pending) {
    const shared = await pending;
    return { ...shared, meta: { ...shared.meta, cacheHit: true } };
  }

  const request = runExtSearch(query, options);
  inflight.set(key, request);
  try {
    const response = await request;
    const anyEngineOk = response.meta.engines.some((e) => e.success);
    // Don't cache a total failure; cache a partial one briefly.
    if (anyEngineOk) {
      set(key, response, response.meta.partial ? EXTSEARCH_PARTIAL_TTL_MS : EXTSEARCH_CACHE_TTL_MS);
    }
    return { ...response, meta: { ...response.meta, cacheHit: false } };
  } finally {
    inflight.delete(key);
  }
}

/** Tests only. */
export function clearExtSearchCache(): void {
  entries.clear();
  inflight.clear();
}

export function extSearchCacheSize(): number {
  return entries.size;
}
