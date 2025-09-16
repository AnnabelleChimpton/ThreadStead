/**
 * SearXNG Engine Adapter
 * Privacy-focused meta-search engine
 * Can use public instances or self-hosted
 */

import type {
  ExtSearchEngine,
  ExtSearchQuery,
  EngineSearchResult,
  ExtSearchResultItem,
  EngineCapabilities
} from '../types';
import { analyzeIndieWeb, estimatePrivacyScore } from '../merge';

interface SearXNGResult {
  url: string;
  title: string;
  content?: string;
  engine?: string;
  engines?: string[];
  score?: number;
  publishedDate?: string;
  thumbnail?: string;
  parsed_url?: string[];
}

interface SearXNGResponse {
  query: string;
  number_of_results?: number;
  results: SearXNGResult[];
  suggestions?: string[];
  infoboxes?: any[];
  answers?: string[];
}

// Public SearXNG instances (fallback list) - more reliable instances
const PUBLIC_INSTANCES = [
  'https://searx.work',
  'https://search.sapti.me',
  'https://searx.tiekoetter.com',
  'https://searx.be',
  'https://paulgo.io',
];

export class SearXNGEngine implements ExtSearchEngine {
  public readonly id = 'searxng' as const;
  public readonly name = 'SearXNG';
  public readonly description = 'Privacy-respecting metasearch engine';
  public readonly requiresAuth = false;
  public readonly privacyRating = 'excellent' as const;

  public readonly capabilities: EngineCapabilities = {
    search: true,
    instantAnswer: true,
    images: true,
    news: true,
    suggestions: true
  };

  public readonly rateLimit = {
    requestsPerMinute: 30,
    requestsPerDay: 1000
  };

  private baseUrl: string;
  private instanceUrls: string[];
  private currentInstanceIndex = 0;

  constructor(config?: {
    baseUrl?: string;
    instanceUrls?: string[];
  }) {
    this.baseUrl = config?.baseUrl || process.env.SEARXNG_INSTANCE_URL || PUBLIC_INSTANCES[0];
    this.instanceUrls = config?.instanceUrls || [this.baseUrl, ...PUBLIC_INSTANCES];
  }

  public isAvailable(): boolean {
    // SearXNG is available if we have at least one instance URL
    return this.instanceUrls.length > 0;
  }

  private getCurrentInstance(): string {
    return this.instanceUrls[this.currentInstanceIndex];
  }

  private rotateInstance(): void {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.instanceUrls.length;
  }

  public async search(
    query: ExtSearchQuery,
    signal?: AbortSignal
  ): Promise<EngineSearchResult> {
    let lastError: Error | null = null;

    // Try up to 3 instances if one fails
    for (let attempt = 0; attempt < Math.min(3, this.instanceUrls.length); attempt++) {
      try {
        const instance = this.getCurrentInstance();
        const params = new URLSearchParams({
          q: query.q,
          format: 'json',
          categories: query.category === 'news' ? 'news' : 'general',
          time_range: '', // all time
          language: 'en',
          safesearch: query.safeSearch ? '1' : '0',
          pageno: String((query.page || 0) + 1)
        });

        // Add site scope if provided
        if (query.siteScope) {
          params.set('q', `site:${query.siteScope} ${query.q}`);
        }

        const url = `${instance}/search?${params}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ThreadStead MetaSearch/1.0'
          },
          signal
        });

        if (!response.ok) {
          throw new Error(`SearXNG API error: ${response.status} ${response.statusText}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`SearXNG returned non-JSON response: ${contentType}`);
        }

        const data: SearXNGResponse = await response.json();

        // Transform results to our format
        const results: ExtSearchResultItem[] = (data.results || []).map((item, index) => {
          const domain = this.extractDomain(item.url);
          const isIndieWeb = analyzeIndieWeb(domain);
          const privacyScore = estimatePrivacyScore(domain);

          // Determine content type from engines that returned this result
          const contentType = this.guessContentType(item.url, item.title, item.engines);

          return {
            engine: this.id,
            url: item.url,
            title: item.title || 'Untitled',
            snippet: item.content || '',
            score: item.score,
            position: index + 1,
            publishedDate: item.publishedDate,
            favicon: item.thumbnail,

            // Privacy and indie indicators
            isIndieWeb,
            privacyScore,
            contentType,

            // SearXNG doesn't track, but the original sites might
            hasCookies: undefined,
            hasTrackers: undefined,

            // Engine-specific metadata
            engineMetadata: {
              engines: item.engines || [item.engine],
              instance: instance
            }
          };
        });

        return {
          results,
          totalResults: data.number_of_results,
          searchTime: undefined // SearXNG doesn't provide this
        };

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error; // Re-throw abort errors
        }

        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`SearXNG instance ${this.getCurrentInstance()} failed:`, error);

        // Try next instance
        this.rotateInstance();
      }
    }

    // All instances failed
    throw new Error(`SearXNG search failed after ${Math.min(3, this.instanceUrls.length)} attempts: ${lastError?.message}`);
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url.split('/')[2] || url;
    }
  }

  private guessContentType(
    url: string,
    title: string,
    engines?: string[]
  ): 'blog' | 'forum' | 'personal' | 'wiki' | 'commercial' | 'unknown' {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Check if it came from Wikipedia
    if (engines?.includes('wikipedia') || urlLower.includes('wikipedia.org')) {
      return 'wiki';
    }

    // Check for blog indicators
    if (
      urlLower.includes('blog') ||
      urlLower.includes('/post/') ||
      urlLower.includes('/article/') ||
      urlLower.includes('medium.com') ||
      urlLower.includes('substack.com') ||
      titleLower.includes('blog')
    ) {
      return 'blog';
    }

    // Check for forum indicators
    if (
      urlLower.includes('forum') ||
      urlLower.includes('reddit.com') ||
      urlLower.includes('stackoverflow.com') ||
      urlLower.includes('/thread/') ||
      urlLower.includes('/topic/') ||
      titleLower.includes('forum') ||
      titleLower.includes('discussion')
    ) {
      return 'forum';
    }

    // Check for personal site indicators
    if (
      urlLower.includes('github.io') ||
      urlLower.includes('netlify') ||
      urlLower.includes('vercel') ||
      urlLower.includes('personal') ||
      urlLower.includes('portfolio')
    ) {
      return 'personal';
    }

    // Check for commercial indicators
    if (
      engines?.includes('amazon') ||
      engines?.includes('ebay') ||
      urlLower.includes('shop') ||
      urlLower.includes('store') ||
      urlLower.includes('buy') ||
      urlLower.includes('product')
    ) {
      return 'commercial';
    }

    return 'unknown';
  }
}

// Export a factory function
export function createSearXNGEngine(config?: {
  baseUrl?: string;
  instanceUrls?: string[];
}): SearXNGEngine {
  return new SearXNGEngine(config);
}