/**
 * SearchMySite Engine Adapter
 * Free, indie web focused search engine
 * API Docs: https://searchmysite.net/api/v1/
 */

import type {
  ExtSearchEngine,
  ExtSearchQuery,
  EngineSearchResult,
  ExtSearchResultItem,
  EngineCapabilities
} from '../types';
import { analyzeIndieWeb, estimatePrivacyScore } from '../merge';

export class SearchMySiteEngine implements ExtSearchEngine {
  public readonly id = 'searchmysite' as const;
  public readonly name = 'SearchMySite';
  public readonly description = 'Independent search for independent websites';
  public readonly requiresAuth = false;
  public readonly privacyRating = 'excellent' as const;

  public readonly capabilities: EngineCapabilities = {
    search: true,
    instantAnswer: false,
    images: false,
    news: false,
    suggestions: false
  };

  public readonly rateLimit = {
    requestsPerMinute: 10,
    requestsPerDay: 100 // Free tier limit
  };

  private baseUrl: string;

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl || 'https://searchmysite.net/api/v1/feed';
  }

  public isAvailable(): boolean {
    // SearchMySite is always available (no auth required)
    return true;
  }

  public async search(
    query: ExtSearchQuery,
    signal?: AbortSignal
  ): Promise<EngineSearchResult> {
    try {
      const params = new URLSearchParams({
        q: query.q,
        // SearchMySite feed uses 'start-index' for pagination (1-based)
        'start-index': String(((query.page || 0) * (query.perPage || 20)) + 1),
        // Default to 20 results per page
        'max-results': String(query.perPage || 20)
      });

      // Add site scope if provided
      if (query.siteScope) {
        params.set('q', `site:${query.siteScope} ${query.q}`);
      }

      const url = `${this.baseUrl}/search/?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/atom+xml',
          'User-Agent': 'ThreadStead MetaSearch/1.0'
        },
        signal
      });

      if (!response.ok) {
        throw new Error(`SearchMySite API error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();

      // Parse XML feed
      const results = this.parseAtomFeed(xmlText);

      return {
        results,
        totalResults: undefined, // Will be extracted from XML
        searchTime: undefined
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // Re-throw abort errors
      }

      console.error('SearchMySite search failed:', error);
      throw new Error(`SearchMySite search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseAtomFeed(xmlText: string): ExtSearchResultItem[] {
    try {
      // Simple XML parsing for Atom feed
      const results: ExtSearchResultItem[] = [];

      // Extract entries using regex (simple approach)
      const entryMatches = xmlText.match(/<entry[^>]*>.*?<\/entry>/gs);

      if (entryMatches) {
        entryMatches.forEach((entry, index) => {
          // Extract title
          const titleMatch = entry.match(/<title[^>]*>(.*?)<\/title>/s);
          const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : 'Untitled';

          // Extract link
          const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
          const url = linkMatch ? linkMatch[1] : '';

          // Extract summary/content
          const summaryMatch = entry.match(/<summary[^>]*>(.*?)<\/summary>/s) ||
                              entry.match(/<content[^>]*>(.*?)<\/content>/s);
          const snippet = summaryMatch ?
            summaryMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : '';

          if (url && title) {
            const domain = this.extractDomain(url);
            const isIndieWeb = analyzeIndieWeb(domain);
            const privacyScore = estimatePrivacyScore(domain);

            results.push({
              engine: this.id,
              url,
              title,
              snippet,
              position: index + 1,

              // Privacy and indie indicators
              isIndieWeb,
              privacyScore,
              contentType: this.guessContentType(url, title),

              // SearchMySite is privacy-focused by nature
              hasCookies: false,
              hasTrackers: false,

              // Engine-specific metadata
              engineMetadata: {
                domain
              }
            });
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to parse SearchMySite Atom feed:', error);
      return [];
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
    title: string
  ): 'blog' | 'forum' | 'personal' | 'wiki' | 'commercial' | 'unknown' {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Check for blog indicators
    if (
      urlLower.includes('blog') ||
      urlLower.includes('/post/') ||
      urlLower.includes('/article/') ||
      titleLower.includes('blog')
    ) {
      return 'blog';
    }

    // Check for forum indicators
    if (
      urlLower.includes('forum') ||
      urlLower.includes('/thread/') ||
      urlLower.includes('/topic/') ||
      titleLower.includes('forum') ||
      titleLower.includes('discussion')
    ) {
      return 'forum';
    }

    // Check for wiki indicators
    if (
      urlLower.includes('wiki') ||
      titleLower.includes('wiki') ||
      titleLower.includes('encyclopedia')
    ) {
      return 'wiki';
    }

    // Check for personal site indicators
    if (
      urlLower.includes('github.io') ||
      urlLower.includes('netlify') ||
      urlLower.includes('vercel') ||
      urlLower.includes('personal') ||
      urlLower.includes('portfolio') ||
      titleLower.includes('personal') ||
      titleLower.includes('portfolio')
    ) {
      return 'personal';
    }

    // Check for commercial indicators
    if (
      urlLower.includes('shop') ||
      urlLower.includes('store') ||
      urlLower.includes('buy') ||
      urlLower.includes('product') ||
      titleLower.includes('shop') ||
      titleLower.includes('store') ||
      titleLower.includes('buy')
    ) {
      return 'commercial';
    }

    // Default to unknown
    return 'unknown';
  }
}

// Export a factory function
export function createSearchMySiteEngine(config?: { baseUrl?: string }): SearchMySiteEngine {
  return new SearchMySiteEngine(config);
}