// Template compilation caching utilities
// Uses in-memory Map cache with LRU eviction (Pages directory compatible)
// Expected improvement: 80-95% faster template saves on cache hits

import crypto from 'crypto';
import type { TemplateNode } from './template-parser';
import type { Island } from './compiler/types';

// Cache configuration
const CACHE_TTL = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached templates
const CACHE_VERSION = 'v1'; // Bump to invalidate all caches globally

// Cached compilation entry
interface CachedCompilation {
  result: CompilationResult;
  cachedAt: number;
  lastAccessed: number;
  hash: string;
}

/**
 * Compilation result structure
 */
export interface CompilationResult {
  ast: TemplateNode;
  islands: Island[];
  staticHTML: string;
}

// In-memory cache with LRU eviction
// Note: This cache is per-server-instance and doesn't persist across restarts
// For distributed caching, consider migrating to Redis or App Router
const compilationCache = new Map<string, CachedCompilation>();

// Performance metrics (in-memory counters)
let cacheHits = 0;
let cacheMisses = 0;
let compilationTimeMs = 0;

/**
 * Generate content-addressed cache key for template
 * Uses SHA-256 hash of template content (first 16 chars for brevity)
 */
export function generateTemplateHash(template: string): string {
  return crypto
    .createHash('sha256')
    .update(template)
    .digest('hex')
    .substring(0, 16); // 16 chars provides sufficient uniqueness
}

/**
 * Evict stale entries (older than TTL)
 */
function evictStaleEntries() {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [key, entry] of compilationCache.entries()) {
    if (now - entry.cachedAt > CACHE_TTL) {
      toDelete.push(key);
    }
  }

  toDelete.forEach(key => compilationCache.delete(key));

  if (toDelete.length > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[TemplateCache] Evicted ${toDelete.length} stale entries`);
  }
}

/**
 * Evict least recently used entries if cache is full
 */
function evictLRU() {
  if (compilationCache.size <= MAX_CACHE_SIZE) return;

  // Find oldest accessed entry
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of compilationCache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    compilationCache.delete(oldestKey);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TemplateCache] LRU eviction: removed entry (hash: ${oldestKey})`);
    }
  }
}

/**
 * Get cache statistics (useful for monitoring and debugging)
 *
 * Returns metrics about cache performance:
 * - hits: Number of times cache was hit
 * - misses: Number of times compilation was required
 * - hitRate: Percentage of cache hits
 * - avgCompilationMs: Average compilation time on cache misses
 * - cacheSize: Current number of entries in cache
 * - maxCacheSize: Maximum allowed cache size before LRU eviction
 */
export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    total,
    hitRate: total > 0 ? (cacheHits / total * 100).toFixed(1) + '%' : '0%',
    avgCompilationMs: cacheMisses > 0 ? Math.round(compilationTimeMs / cacheMisses) : 0,
    cacheSize: compilationCache.size,
    maxCacheSize: MAX_CACHE_SIZE
  };
}

/**
 * Reset cache statistics (useful for testing)
 */
export function resetCacheStats() {
  cacheHits = 0;
  cacheMisses = 0;
  compilationTimeMs = 0;
}

/**
 * Get compiled template with caching and performance tracking
 *
 * This is the main entry point for cached template compilation.
 * Uses an in-memory Map cache with LRU eviction and TTL expiration.
 *
 * Cache behavior:
 * - HIT: Template hash found in cache, returns in <2ms
 * - MISS: Template not in cache or expired, compiles (50-500ms), then caches result
 * - Automatic LRU eviction when cache exceeds MAX_CACHE_SIZE
 * - Automatic TTL expiration after 7 days
 *
 * @param templateContent - Raw HTML template content
 * @param compileFunction - Function that performs actual compilation (only called on cache miss)
 * @returns Compiled template result
 *
 * @example
 * ```typescript
 * const result = await getCompiledTemplateWithMetrics(
 *   customTemplate,
 *   async () => {
 *     const parseResult = compileTemplate(customTemplate);
 *     const islandResult = identifyIslandsWithTransform(parseResult.ast);
 *     const staticHTML = generateStaticHTML(islandResult.transformedAst, islandResult.islands);
 *     return { ast: islandResult.transformedAst, islands: islandResult.islands, staticHTML };
 *   }
 * );
 * ```
 *
 * Performance expectations:
 * - First save (MISS): 150-500ms
 * - Subsequent saves (HIT): <2ms
 * - Improvement: 99%+ on cache hits
 */
export async function getCompiledTemplateWithMetrics(
  templateContent: string,
  compileFunction: () => Promise<CompilationResult>
): Promise<CompilationResult> {
  const startTime = performance.now();
  const hash = generateTemplateHash(templateContent);
  const cacheKey = `${CACHE_VERSION}-${hash}`;

  // Periodic cleanup of stale entries
  evictStaleEntries();

  // Check cache
  const cached = compilationCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.cachedAt) < CACHE_TTL) {
    // Cache HIT - return cached result
    cached.lastAccessed = now; // Update LRU timestamp
    cacheHits++;

    const duration = performance.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TemplateCache] HIT - Retrieved in ${duration.toFixed(1)}ms (hash: ${hash})`);
    }

    return cached.result;
  }

  // Cache MISS - compile template
  cacheMisses++;

  try {
    const result = await compileFunction();

    const endTime = performance.now();
    const duration = endTime - startTime;
    compilationTimeMs += duration;

    // Store in cache
    compilationCache.set(cacheKey, {
      result,
      cachedAt: now,
      lastAccessed: now,
      hash
    });

    // Evict LRU entry if cache is full
    evictLRU();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TemplateCache] MISS - Compiled in ${duration.toFixed(0)}ms (hash: ${hash})`);
    }

    return result;

  } catch (error) {
    // Don't cache errors - always retry on errors
    throw error;
  }
}

/**
 * Manually clear all cached templates
 *
 * This is useful for:
 * - Admin operations (clearing cache for all users)
 * - Development/testing (resetting cache state)
 * - Component registry updates (new components added)
 */
export function clearTemplateCache() {
  const sizeBefore = compilationCache.size;
  compilationCache.clear();
  console.log(`[TemplateCache] Cache cleared (removed ${sizeBefore} entries)`);
}
