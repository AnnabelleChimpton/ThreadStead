/**
 * Mojeek Search Engine Adapter
 * Independent UK-based search engine with no tracking
 * API Docs: https://www.mojeek.com/services/api/
 */

import type {
  ExtSearchEngine,
  ExtSearchQuery,
  EngineSearchResult,
  ExtSearchResultItem,
  EngineCapabilities
} from '../types';
import { analyzeIndieWeb, estimatePrivacyScore } from '../merge';

interface MojeekResult {
  url: string;
  title: string;
  description?: string;
  date?: string;
  domain?: string;
}

interface MojeekResponse {
  response: {
    results: MojeekResult[];
    totalResults?: number;
    searchTime?: number;
  };
  request: {
    query: string;
    start: number;
    results: number;
  };
}

export class MojeekEngine implements ExtSearchEngine {
  public readonly id = 'mojeek' as const;
  public readonly name = 'Mojeek';
  public readonly description = 'Independent search engine with no tracking';
  public readonly requiresAuth = true;
  public readonly privacyRating = 'excellent' as const;

  public readonly capabilities: EngineCapabilities = {
    search: true,
    instantAnswer: false,
    images: false,
    news: false,
    suggestions: false
  };

  public readonly rateLimit = {
    requestsPerMinute: 60,
    requestsPerDay: 5000 // Depends on API plan
  };

  private apiKey: string | undefined;
  private baseUrl: string;

  constructor(config?: {
    apiKey?: string;
    baseUrl?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.MOJEEK_API_KEY;
    this.baseUrl = config?.baseUrl || 'https://api.mojeek.com';
  }

  public isAvailable(): boolean {
    return !!this.apiKey;
  }

  public async search(
    query: ExtSearchQuery,
    signal?: AbortSignal
  ): Promise<EngineSearchResult> {
    if (!this.apiKey) {
      throw new Error('Mojeek API key not configured');
    }

    try {
      const params = new URLSearchParams({
        q: query.q,
        api_key: this.apiKey,
        fmt: 'json',
        // Mojeek uses 's' for start index (0-based)
        s: String((query.page || 0) * (query.perPage || 20)),
        // Number of results to return
        n: String(query.perPage || 20),
        // Language
        lb: 'en',
        // Safe search
        safe: query.safeSearch ? '1' : '0'
      });

      // Add site scope if provided
      if (query.siteScope) {
        params.set('q', `site:${query.siteScope} ${query.q}`);
      }

      const url = `${this.baseUrl}/search?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ThreadStead MetaSearch/1.0'
        },
        signal
      });

      if (!response.ok) {
        throw new Error(`Mojeek API error: ${response.status} ${response.statusText}`);
      }

      const data: MojeekResponse = await response.json();

      // Transform results to our format
      const results: ExtSearchResultItem[] = (data.response?.results || []).map((item, index) => {
        const domain = item.domain || this.extractDomain(item.url);
        const isIndieWeb = analyzeIndieWeb(domain);
        const privacyScore = estimatePrivacyScore(domain);

        return {
          engine: this.id,
          url: item.url,
          title: item.title || 'Untitled',
          snippet: item.description || '',
          position: index + 1,
          publishedDate: item.date,

          // Privacy and indie indicators
          isIndieWeb,
          privacyScore,
          contentType: this.guessContentType(item.url, item.title, item.description),

          // Mojeek doesn't track and respects privacy
          hasCookies: false,
          hasTrackers: false,

          // Engine-specific metadata
          engineMetadata: {
            domain: domain,
            date: item.date
          }
        };
      });

      return {
        results,
        totalResults: data.response?.totalResults,
        searchTime: data.response?.searchTime
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      console.error('Mojeek search failed:', error);
      throw new Error(`Mojeek search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Check for wiki
    if (combined.includes('wiki') || url.includes('wikipedia.org')) {
      return 'wiki';
    }

    // Check for blog
    if (
      combined.includes('blog') ||
      url.includes('/post/') ||
      url.includes('/article/') ||
      url.includes('/2024/') || // Date patterns common in blogs
      url.includes('/2023/') ||
      url.includes('medium.com') ||
      url.includes('wordpress.com') ||
      url.includes('blogspot.com') ||
      url.includes('substack.com')
    ) {
      return 'blog';
    }

    // Check for forum
    if (
      combined.includes('forum') ||
      combined.includes('discussion') ||
      combined.includes('community') ||
      url.includes('reddit.com') ||
      url.includes('stackoverflow.com') ||
      url.includes('/thread/') ||
      url.includes('/topic/')
    ) {
      return 'forum';
    }

    // Check for personal sites
    if (
      url.includes('github.io') ||
      url.includes('gitlab.io') ||
      url.includes('netlify') ||
      url.includes('vercel') ||
      url.includes('neocities.org') ||
      combined.includes('portfolio') ||
      combined.includes('personal') ||
      combined.includes('about me')
    ) {
      return 'personal';
    }

    // Check for commercial
    if (
      combined.includes('shop') ||
      combined.includes('store') ||
      combined.includes('buy') ||
      combined.includes('sale') ||
      combined.includes('price') ||
      combined.includes('product') ||
      combined.includes('cart')
    ) {
      return 'commercial';
    }

    return 'unknown';
  }
}

// Export a factory function
export function createMojeekEngine(config?: {
  apiKey?: string;
  baseUrl?: string;
}): MojeekEngine {
  return new MojeekEngine(config);
}