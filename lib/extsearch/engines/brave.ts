/**
 * Brave Search Engine Adapter
 * Privacy-focused search with free API tier
 * API Docs: https://brave.com/search/api/
 */

import type {
  ExtSearchEngine,
  ExtSearchQuery,
  EngineSearchResult,
  ExtSearchResultItem,
  EngineCapabilities
} from '../types';
import { analyzeIndieWeb, estimatePrivacyScore } from '../merge';

interface BraveSearchResult {
  title: string;
  url: string;
  description?: string;
  age?: string;
  page_age?: string;
  thumbnail?: {
    src: string;
  };
  favicon?: string;
  family_friendly?: boolean;
}

interface BraveSearchResponse {
  query: {
    original: string;
    show_strict_warning: boolean;
    is_navigational: boolean;
    is_news_breaking: boolean;
    local_decision: string;
    local_locations_idx: number;
    is_safe: boolean;
  };
  mixed: {
    type: string;
    main?: Array<{
      type: string;
      index?: number;
      all?: boolean;
    }>;
    top?: any[];
    side?: any[];
  };
  type: string;
  web?: {
    type: string;
    results: BraveSearchResult[];
    family_friendly: boolean;
  };
  news?: {
    type: string;
    results: any[];
  };
}

export class BraveSearchEngine implements ExtSearchEngine {
  public readonly id = 'brave' as const;
  public readonly name = 'Brave Search';
  public readonly description = 'Independent, privacy-focused search';
  public readonly requiresAuth = true;
  public readonly privacyRating = 'excellent' as const;

  public readonly capabilities: EngineCapabilities = {
    search: true,
    instantAnswer: false,
    images: false, // Available with paid tier
    news: true,
    suggestions: false
  };

  public readonly rateLimit = {
    requestsPerMinute: 60, // Free tier: 1 request per second = 60 per minute
    requestsPerDay: 2000 // Free tier daily limit
  };

  private apiKey: string | undefined;
  private baseUrl: string;
  private lastRequestTime: number = 0;
  private pendingRequest: Promise<void> = Promise.resolve();

  constructor(config?: {
    apiKey?: string;
    baseUrl?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.BRAVE_API_KEY;
    this.baseUrl = config?.baseUrl || 'https://api.search.brave.com/res/v1';
  }

  public isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Enforce rate limit with proper queueing to prevent race conditions
   * Free tier allows 1 request per second (60 per minute)
   * Uses promise chaining to ensure requests are truly serialized
   */
  private async enforceRateLimit(): Promise<void> {
    // Chain onto the previous request's promise
    const previousRequest = this.pendingRequest;

    // Create a new promise for this request
    let resolveThis: () => void;
    this.pendingRequest = new Promise<void>(resolve => {
      resolveThis = resolve;
    });

    // Wait for previous request to complete its rate limit delay
    await previousRequest;

    // Now calculate wait time based on when the last request actually completed
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 60000 / this.rateLimit.requestsPerMinute; // 60000ms per minute / 60 = 1000ms

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update timestamp and signal that this request's rate limit check is complete
    this.lastRequestTime = Date.now();
    resolveThis!();
  }

  /**
   * Retry logic with exponential backoff for rate limit errors
   * Tolerant approach: expects first attempt to fail due to serverless rate limiter limitations
   * Retries up to 5 times with shorter delays: 500ms, 750ms, 1s, 1.5s, 2s
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 5
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a rate limit error (429)
        const is429 = lastError.message.includes('429') ||
                      lastError.message.includes('RATE_LIMITED') ||
                      lastError.message.includes('rate limit');

        // If not a rate limit error, don't retry
        if (!is429) {
          throw lastError;
        }

        // If we've exhausted retries, throw with user-friendly message
        if (attempt === maxRetries) {
          throw new Error('Brave Search temporarily unavailable - rate limit exceeded. Try again in a moment.');
        }

        // Shorter backoff delays for faster recovery: 500ms, 750ms, 1s, 1.5s, 2s
        const backoffDelay = attempt === 0 ? 500 : Math.min(Math.pow(1.5, attempt) * 500, 2000);

        // Only log in development, and only after multiple attempts
        if (process.env.NODE_ENV === 'development' && attempt > 1) {
          console.log(`Brave Search rate limited, retry ${attempt + 1}/${maxRetries + 1} in ${Math.round(backoffDelay)}ms`);
        }

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    throw lastError!;
  }

  public async search(
    query: ExtSearchQuery,
    signal?: AbortSignal
  ): Promise<EngineSearchResult> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key not configured');
    }

    // Wrap the entire search logic in retry with backoff
    return await this.retryWithBackoff(async () => {
      // Enforce rate limit before making request
      await this.enforceRateLimit();

      return await this.performSearch(query, signal);
    });
  }

  /**
   * Perform the actual search request
   * Separated from public search() method to enable retry logic
   */
  private async performSearch(
    query: ExtSearchQuery,
    signal?: AbortSignal
  ): Promise<EngineSearchResult> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key not configured');
    }

    try {
      // Brave API has very strict limits - try up to their documented default
      const safeCount = Math.min(query.perPage || 20, 20); // Test with up to 20 results (their default)

      // Brave API rejects any offset > 0, so only allow page 0
      const currentPage = query.page || 0;
      if (currentPage > 0) {
        return {
          results: [],
          totalResults: 0,
          searchTime: 0
        };
      }

      // Always use offset 0 (pagination disabled for Brave)
      const safeOffset = 0;

      const params = new URLSearchParams({
        q: query.q,
        offset: String(safeOffset),
        count: String(safeCount),
        safesearch: query.safeSearch ? 'strict' : 'off',
        freshness: '', // all time
        text_decorations: 'false',
        result_filter: query.category === 'news' ? 'news' : 'web'
      });

      // Add site scope if provided
      if (query.siteScope) {
        params.set('q', `site:${query.siteScope} ${query.q}`);
      }

      const url = `${this.baseUrl}/web/search?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey
        },
        signal
      });

      if (!response.ok) {
        // Get error details for debugging
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = ` - ${errorBody.substring(0, 200)}`;
        } catch (e) {
          // Ignore error body parsing issues
        }
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}${errorDetails}`);
      }

      const data: BraveSearchResponse = await response.json();

      // Transform web results to our format
      const results: ExtSearchResultItem[] = (data.web?.results || []).map((item, index) => {
        const domain = this.extractDomain(item.url);
        const isIndieWeb = analyzeIndieWeb(domain);
        const privacyScore = estimatePrivacyScore(domain);

        return {
          engine: this.id,
          url: item.url,
          title: item.title || 'Untitled',
          snippet: item.description || '',
          position: index + 1,
          publishedDate: item.page_age,
          favicon: item.favicon,

          // Privacy and indie indicators
          isIndieWeb,
          privacyScore,
          contentType: this.guessContentType(item.url, item.title, item.description),

          // Brave doesn't track
          hasCookies: false,
          hasTrackers: false,

          // Engine-specific metadata
          engineMetadata: {
            age: item.age,
            familyFriendly: item.family_friendly,
            thumbnail: item.thumbnail?.src
          }
        };
      });

      // Add news results if requested
      if (query.category === 'news' && data.news?.results) {
        const newsResults = data.news.results.map((item: any, index: number) => ({
          engine: this.id,
          url: item.url,
          title: item.title || 'Untitled',
          snippet: item.description || '',
          position: results.length + index + 1,
          publishedDate: item.age,
          contentType: 'unknown' as const,
          isIndieWeb: false,
          privacyScore: 0.5,
          hasCookies: undefined,
          hasTrackers: undefined,
          engineMetadata: {
            source: item.source,
            thumbnail: item.thumbnail?.src
          }
        }));
        results.push(...newsResults);
      }

      return {
        results,
        totalResults: results.length, // Brave doesn't provide total count
        searchTime: undefined
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      console.error('Brave Search failed:', error);
      throw new Error(`Brave Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    description?: string
  ): 'blog' | 'forum' | 'personal' | 'wiki' | 'commercial' | 'excluded' | 'unknown' {
    const combined = `${url} ${title} ${description || ''}`.toLowerCase();
    const urlLower = url.toLowerCase();

    // Check for excluded domains first
    const excludedDomains = [
      'wikipedia.org', 'wikimedia.org', 'wikidata.org', 'wikiquote.org',
      'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
      'cnn.com', 'bbc.com', 'nytimes.com', 'reddit.com', 'stackoverflow.com'
    ];

    if (excludedDomains.some(domain => urlLower.includes(domain))) {
      return 'excluded';
    }

    if (combined.includes('wiki')) {
      return 'wiki';
    }

    if (
      combined.includes('blog') ||
      url.includes('/post/') ||
      url.includes('/article/') ||
      url.includes('medium.com') ||
      url.includes('substack.com')
    ) {
      return 'blog';
    }

    if (
      combined.includes('forum') ||
      combined.includes('discussion') ||
      url.includes('reddit.com') ||
      url.includes('stackoverflow.com')
    ) {
      return 'forum';
    }

    if (
      url.includes('github.io') ||
      url.includes('netlify') ||
      url.includes('vercel') ||
      combined.includes('portfolio') ||
      combined.includes('personal')
    ) {
      return 'personal';
    }

    if (
      combined.includes('shop') ||
      combined.includes('store') ||
      combined.includes('buy') ||
      combined.includes('price') ||
      combined.includes('sale')
    ) {
      return 'commercial';
    }

    return 'unknown';
  }
}

// Export a factory function
export function createBraveSearchEngine(config?: {
  apiKey?: string;
  baseUrl?: string;
}): BraveSearchEngine {
  return new BraveSearchEngine(config);
}