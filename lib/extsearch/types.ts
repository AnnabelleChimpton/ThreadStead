/**
 * External Search Types
 * Core type definitions for the indie/privacy-focused meta-search system
 */

export type EngineId =
  | 'searchmysite'
  | 'searxng'
  | 'brave'
  | 'mojeek'
  | 'duckduckgo'
  | 'qwant';

export interface ExtSearchQuery {
  q: string;
  page?: number;
  perPage?: number;
  siteScope?: string;
  category?: 'general' | 'blogs' | 'indie' | 'news';
  safeSearch?: boolean;
}

export interface ExtSearchResultItem {
  // Core fields
  engine: EngineId;
  url: string;
  title: string;
  snippet?: string;

  // Ranking and metadata
  score?: number;
  position?: number;
  favicon?: string;
  publishedDate?: string;

  // Privacy and indie web indicators
  privacyScore?: number;        // 0-1 score based on site's privacy practices
  isIndieWeb?: boolean;         // Flag for indie/personal sites
  hasCookies?: boolean;          // Warning flag
  hasTrackers?: boolean;         // Warning flag
  contentType?: 'blog' | 'forum' | 'personal' | 'commercial' | 'wiki' | 'unknown';

  // Engine-specific metadata
  engineMetadata?: Record<string, any>;
}

export interface EngineSearchResult {
  results: ExtSearchResultItem[];
  totalResults?: number;
  searchTime?: number;
}

export interface ExtSearchResponse {
  query: ExtSearchQuery;
  results: ExtSearchResultItem[];
  meta: {
    engines: Array<{
      id: EngineId;
      name: string;
      success: boolean;
      latencyMs: number;
      resultCount?: number;
      error?: string;
    }>;
    totalMs: number;
    partial: boolean;
    totalResults: number;
    cacheHit?: boolean;
  };
}

export interface EngineCapabilities {
  search: boolean;
  instantAnswer: boolean;
  images: boolean;
  news: boolean;
  suggestions: boolean;
}

export interface ExtSearchEngine {
  id: EngineId;
  name: string;
  description: string;
  requiresAuth: boolean;
  capabilities: EngineCapabilities;
  privacyRating: 'excellent' | 'good' | 'moderate';

  // Rate limiting configuration
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };

  // Main search method
  search(query: ExtSearchQuery, signal?: AbortSignal): Promise<EngineSearchResult>;

  // Check if engine is available
  isAvailable(): boolean;
}

export interface EngineConfig {
  enabled: boolean;
  priority: number;
  fallbackOnly?: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxResults?: number;
}

export interface SearchEngineRegistry {
  engines: Map<EngineId, ExtSearchEngine>;
  configs: Map<EngineId, EngineConfig>;

  register(engine: ExtSearchEngine, config: EngineConfig): void;
  getEnabled(): ExtSearchEngine[];
  getByPriority(): ExtSearchEngine[];
}

// Utility type for normalized URLs
export interface NormalizedUrl {
  original: string;
  normalized: string;
  domain: string;
  path: string;
}

// Cache entry type
export interface CacheEntry {
  query: ExtSearchQuery;
  response: ExtSearchResponse;
  timestamp: number;
  ttl: number;
}