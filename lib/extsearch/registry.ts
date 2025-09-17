/**
 * Search Engine Registry and Orchestrator
 * Manages multiple search engines and runs searches in parallel
 */

import type {
  ExtSearchEngine,
  ExtSearchQuery,
  ExtSearchResponse,
  ExtSearchResultItem,
  EngineConfig,
  SearchEngineRegistry,
  EngineId
} from './types';

import { dedupe, fuseRank, balanceResults, filterResults } from './merge';
import { applyAllBoosts } from './boost';
import { optimizeQuery } from './query-optimizer';
import { createSearchMySiteEngine } from './engines/searchmysite';
import { createSearXNGEngine } from './engines/searxng';
import { createBraveSearchEngine } from './engines/brave';
import { createMojeekEngine } from './engines/mojeek';
import { createDuckDuckGoEngine } from './engines/duckduckgo';

/**
 * Default engine configurations
 */
// Simple in-memory circuit breaker tracking
const engineFailures = new Map<EngineId, { count: number; lastFailure: number }>();
const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW = 5 * 60 * 1000; // 5 minutes

function shouldSkipEngine(engineId: EngineId): boolean {
  const failure = engineFailures.get(engineId);
  if (!failure) return false;

  const now = Date.now();
  if (now - failure.lastFailure > FAILURE_WINDOW) {
    // Reset failure count after window
    engineFailures.delete(engineId);
    return false;
  }

  return failure.count >= FAILURE_THRESHOLD;
}

function recordEngineFailure(engineId: EngineId): void {
  const existing = engineFailures.get(engineId);
  engineFailures.set(engineId, {
    count: (existing?.count || 0) + 1,
    lastFailure: Date.now()
  });
}

const DEFAULT_CONFIGS: Record<EngineId, EngineConfig> = {
  searchmysite: {
    enabled: true, // Re-enable now that infinite loop is fixed
    priority: 1,
    fallbackOnly: false,
    timeout: 3000,
    maxResults: 50
  },
  searxng: {
    enabled: true, // Re-enable for more results
    priority: 3,
    fallbackOnly: false,
    timeout: 3500,
    maxResults: 50
  },
  brave: {
    enabled: false, // Disabled by default (requires API key)
    priority: 2,
    fallbackOnly: false,
    timeout: 3000,
    maxResults: 20
  },
  mojeek: {
    enabled: false, // Disabled by default (requires API key)
    priority: 3,
    fallbackOnly: false,
    timeout: 3000,
    maxResults: 50
  },
  duckduckgo: {
    enabled: false, // Disable - only provides link-outs to DDG
    priority: 4,
    fallbackOnly: true,
    timeout: 2000,
    maxResults: 30
  },
  qwant: {
    enabled: false, // Not implemented yet
    priority: 6,
    fallbackOnly: true,
    timeout: 3000,
    maxResults: 50
  }
};

/**
 * Create and configure the search engine registry
 */
export function createRegistry(): SearchEngineRegistry {
  const engines = new Map<EngineId, ExtSearchEngine>();
  const configs = new Map<EngineId, EngineConfig>();

  // Initialize engines
  const searchMySite = createSearchMySiteEngine();
  const searxng = createSearXNGEngine();
  const brave = createBraveSearchEngine();
  const mojeek = createMojeekEngine();
  const duckduckgo = createDuckDuckGoEngine();

  // Register engines with their configs
  const registry: SearchEngineRegistry = {
    engines,
    configs,

    register(engine: ExtSearchEngine, config: EngineConfig) {
      engines.set(engine.id, engine);
      configs.set(engine.id, config);
    },

    getEnabled(): ExtSearchEngine[] {
      const enabled: ExtSearchEngine[] = [];
      for (const [id, engine] of engines) {
        const config = configs.get(id);
        if (config?.enabled && engine.isAvailable()) {
          enabled.push(engine);
        }
      }
      return enabled;
    },

    getByPriority(): ExtSearchEngine[] {
      return this.getEnabled().sort((a, b) => {
        const configA = configs.get(a.id);
        const configB = configs.get(b.id);
        return (configA?.priority || 999) - (configB?.priority || 999);
      });
    }
  };

  // Register available engines - enable reliable ones
  registry.register(searchMySite, {
    ...DEFAULT_CONFIGS.searchmysite,
    enabled: true // Re-enable SearchMySite
  });

  registry.register(searxng, {
    ...DEFAULT_CONFIGS.searxng,
    enabled: false // Disable due to consistent rate limit failures
  });

  registry.register(duckduckgo, {
    ...DEFAULT_CONFIGS.duckduckgo,
    enabled: false // Disable - only provides link-outs to DDG
  });

  if (brave.isAvailable()) {
    registry.register(brave, {
      ...DEFAULT_CONFIGS.brave,
      enabled: true // This should work if API key is valid
    });
  }

  if (mojeek.isAvailable()) {
    registry.register(mojeek, {
      ...DEFAULT_CONFIGS.mojeek,
      enabled: true
    });
  }

  return registry;
}

/**
 * Main search orchestrator function
 */
export async function runExtSearch(
  query: ExtSearchQuery,
  options?: {
    timeout?: number;
    enabledEngines?: EngineId[];
    filters?: {
      indieOnly?: boolean;
      privacyOnly?: boolean;
      noTrackers?: boolean;
      contentTypes?: string[];
    };
    boost?: {
      ringMembers?: Array<{ domain: string; trustScore?: number; isVerified?: boolean }>;
      communityData?: any;
      enableRecencyBoost?: boolean;
    };
  }
): Promise<ExtSearchResponse> {
  const startTime = Date.now();
  const timeout = options?.timeout || 3500;

  // Create registry and get enabled engines
  const registry = createRegistry();
  let engines = registry.getByPriority();

  // Filter engines if specific ones are requested
  if (options?.enabledEngines && options.enabledEngines.length > 0) {
    engines = engines.filter(e => options.enabledEngines!.includes(e.id));
  }

  if (engines.length === 0) {
    return {
      query,
      results: [],
      meta: {
        engines: [],
        totalMs: Date.now() - startTime,
        partial: false,
        totalResults: 0
      }
    };
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Filter out engines that should be skipped due to circuit breaker
  const availableEngines = engines.filter(engine => {
    if (shouldSkipEngine(engine.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Skipping ${engine.name} due to recent failures`);
      }
      return false;
    }
    return true;
  });

  if (availableEngines.length === 0) {
    return {
      query,
      results: [],
      meta: {
        engines: [],
        totalMs: Date.now() - startTime,
        partial: false,
        totalResults: 0
      }
    };
  }

  // Optimize the query for better results
  const optimizedQuery: ExtSearchQuery = {
    ...query,
    q: optimizeQuery(query.q, {
      enableSpellCorrection: true,
      enableSynonyms: false, // Keep focused results
      enableStopWordRemoval: false, // Preserve user intent
      targetEngine: 'general'
    })
  };

  // Log optimization if query was changed
  if (optimizedQuery.q !== query.q && process.env.NODE_ENV === 'development') {
    console.log(`Query optimized: "${query.q}" → "${optimizedQuery.q}"`);
  }

  // Run searches in parallel
  const searchPromises = availableEngines.map(async (engine) => {
    const engineStartTime = Date.now();
    const config = registry.configs.get(engine.id);

    try {
      // Use engine-specific optimization
      const engineQuery = {
        ...optimizedQuery,
        q: optimizeQuery(query.q, {
          enableSpellCorrection: true,
          enableSynonyms: false,
          enableStopWordRemoval: false,
          targetEngine: engine.id as 'brave' | 'searchmysite' | 'general'
        })
      };

      const result = await engine.search(engineQuery, controller.signal);
      return {
        engineId: engine.id,
        engineName: engine.name,
        success: true,
        latencyMs: Date.now() - engineStartTime,
        results: result.results.slice(0, config?.maxResults || 50),
        totalResults: result.totalResults,
        error: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failure for circuit breaker
      recordEngineFailure(engine.id);

      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Engine ${engine.name} failed (${engineFailures.get(engine.id)?.count || 1}/3):`, errorMessage);
      }

      return {
        engineId: engine.id,
        engineName: engine.name,
        success: false,
        latencyMs: Date.now() - engineStartTime,
        results: [],
        totalResults: 0,
        error: errorMessage
      };
    }
  });

  // Wait for all searches to complete or timeout
  const searchResults = await Promise.allSettled(searchPromises);
  clearTimeout(timeoutId);

  // Process results
  const engineMeta: ExtSearchResponse['meta']['engines'] = [];
  const allResults: ExtSearchResultItem[] = [];
  let hasPartialFailure = false;
  let totalResultCount = 0;

  for (const result of searchResults) {
    if (result.status === 'fulfilled') {
      const engineResult = result.value;
      engineMeta.push({
        id: engineResult.engineId,
        name: engineResult.engineName,
        success: engineResult.success,
        latencyMs: engineResult.latencyMs,
        resultCount: engineResult.results.length,
        error: engineResult.error
      });

      if (engineResult.success) {
        allResults.push(...engineResult.results);
        totalResultCount += engineResult.totalResults || engineResult.results.length;
      } else {
        hasPartialFailure = true;
      }
    } else {
      // Promise rejected (shouldn't happen with our error handling)
      hasPartialFailure = true;
    }
  }

  // Merge and rank results
  let mergedResults = dedupe(allResults);

  // Apply filters if specified
  if (options?.filters) {
    mergedResults = filterResults(mergedResults, options.filters);
  }

  // Apply intelligent ranking that balances engine representation
  if (engineMeta.filter(e => e.success).length > 1) {
    // Multiple engines - balance representation
    mergedResults = balanceResults(mergedResults);
  } else {
    // Single engine - use standard ranking
    mergedResults = fuseRank(mergedResults);
  }

  // Apply boosts if specified
  if (options?.boost) {
    mergedResults = applyAllBoosts(mergedResults, options.boost);
  }

  // Limit final results
  const maxResults = query.perPage || 50;
  const finalResults = mergedResults.slice(0, maxResults);

  return {
    query,
    results: finalResults,
    meta: {
      engines: engineMeta,
      totalMs: Date.now() - startTime,
      partial: hasPartialFailure,
      totalResults: totalResultCount,
      cacheHit: false
    }
  };
}

/**
 * Get available search engines and their status
 */
export function getEngineStatus(): Array<{
  id: EngineId;
  name: string;
  available: boolean;
  requiresAuth: boolean;
  privacyRating: string;
}> {
  const registry = createRegistry();
  const status: Array<{
    id: EngineId;
    name: string;
    available: boolean;
    requiresAuth: boolean;
    privacyRating: string;
  }> = [];

  for (const [id, engine] of registry.engines) {
    status.push({
      id,
      name: engine.name,
      available: engine.isAvailable(),
      requiresAuth: engine.requiresAuth,
      privacyRating: engine.privacyRating
    });
  }

  return status;
}