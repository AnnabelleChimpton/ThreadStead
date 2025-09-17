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
    requestsPerMinute: 60,
    requestsPerDay: 2000 // Free tier limit
  };

  private apiKey: string | undefined;
  private baseUrl: string;

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

  public async search(
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
  ): 'blog' | 'forum' | 'personal' | 'wiki' | 'commercial' | 'unknown' {
    const combined = `${url} ${title} ${description || ''}`.toLowerCase();

    if (combined.includes('wiki') || url.includes('wikipedia.org')) {
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