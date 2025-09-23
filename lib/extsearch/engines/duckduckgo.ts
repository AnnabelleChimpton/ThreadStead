/**
 * DuckDuckGo Instant Answer API
 * Simple fallback search for basic queries
 * Note: This is limited to instant answers, not full web search
 */

import type {
  ExtSearchEngine,
  ExtSearchQuery,
  EngineSearchResult,
  ExtSearchResultItem,
  EngineCapabilities
} from '../types';

interface DuckDuckGoResponse {
  Abstract?: string;
  AbstractText?: string;
  AbstractSource?: string;
  AbstractURL?: string;
  Image?: string;
  Heading?: string;
  Answer?: string;
  AnswerType?: string;
  Definition?: string;
  DefinitionSource?: string;
  DefinitionURL?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
}

export class DuckDuckGoEngine implements ExtSearchEngine {
  public readonly id = 'duckduckgo' as const;
  public readonly name = 'DuckDuckGo Instant';
  public readonly description = 'Instant answers from DuckDuckGo';
  public readonly requiresAuth = false;
  public readonly privacyRating = 'excellent' as const;

  public readonly capabilities: EngineCapabilities = {
    search: true,
    instantAnswer: true,
    images: false,
    news: false,
    suggestions: false
  };

  public readonly rateLimit = {
    requestsPerMinute: 30,
    requestsPerDay: 1000
  };

  private baseUrl: string;

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl || 'https://api.duckduckgo.com';
  }

  public isAvailable(): boolean {
    // DuckDuckGo instant answer API is always available
    return true;
  }

  public async search(
    query: ExtSearchQuery,
    signal?: AbortSignal
  ): Promise<EngineSearchResult> {
    try {
      const params = new URLSearchParams({
        q: query.q,
        format: 'json',
        no_html: '1',
        skip_disambig: '1'
      });

      const url = `${this.baseUrl}/?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ThreadStead MetaSearch/1.0'
        },
        signal
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status} ${response.statusText}`);
      }

      const data: DuckDuckGoResponse = await response.json();


      const results: ExtSearchResultItem[] = [];

      // Add main abstract if available (most common result)
      if (data.Abstract && data.AbstractText) {
        results.push({
          engine: this.id,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query.q)}`,
          title: data.Heading || query.q,
          snippet: data.AbstractText,
          position: 1,

          isIndieWeb: false,
          privacyScore: 0.9,
          contentType: 'unknown',
          hasCookies: false,
          hasTrackers: false,

          engineMetadata: {
            source: data.AbstractSource,
            type: 'abstract'
          }
        });
      }

      // Add instant answer if available
      if (data.Answer && data.AnswerType) {
        results.push({
          engine: this.id,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query.q)}`,
          title: `${data.AnswerType}: ${data.Answer}`,
          snippet: data.AbstractText || data.Answer,
          position: results.length + 1,

          isIndieWeb: false,
          privacyScore: 0.9,
          contentType: 'unknown',
          hasCookies: false,
          hasTrackers: false,

          engineMetadata: {
            answerType: data.AnswerType,
            source: data.AbstractSource,
            type: 'answer'
          }
        });
      }

      // Add definition if available
      if (data.Definition && data.DefinitionURL) {
        results.push({
          engine: this.id,
          url: data.DefinitionURL,
          title: `Definition: ${data.Heading || query.q}`,
          snippet: data.Definition,
          position: results.length + 1,

          isIndieWeb: false,
          privacyScore: 0.9,
          contentType: 'wiki',
          hasCookies: false,
          hasTrackers: false,

          engineMetadata: {
            source: data.DefinitionSource,
            type: 'definition'
          }
        });
      }

      // Add related topics (limited to top 3)
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, 3).forEach((topic, index) => {
          if (topic.FirstURL && topic.Text) {
            results.push({
              engine: this.id,
              url: topic.FirstURL,
              title: topic.Text.split(' - ')[0] || 'Related Topic',
              snippet: topic.Text,
              position: results.length + 1,

              isIndieWeb: false,
              privacyScore: 0.9,
              contentType: 'unknown',
              hasCookies: false,
              hasTrackers: false,

              engineMetadata: {
                type: 'related_topic',
                index: index
              }
            });
          }
        });
      }

      return {
        results,
        totalResults: results.length,
        searchTime: undefined
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      return {
        results: [],
        totalResults: 0,
        searchTime: undefined
      };
    }
  }
}

// Export a factory function
export function createDuckDuckGoEngine(config?: { baseUrl?: string }): DuckDuckGoEngine {
  return new DuckDuckGoEngine(config);
}