/**
 * External Search Results Component
 * Displays results from the privacy-focused meta-search
 */

import React from 'react';
import type { ExtSearchResponse, ExtSearchResultItem } from '@/lib/extsearch/types';

interface ExtSearchResultsProps {
  response: ExtSearchResponse | null;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  showEngineInfo?: boolean;
  showScores?: boolean;
  className?: string;
}

/**
 * Component for displaying external search results
 */
export function ExtSearchResults({
  response,
  loading,
  error,
  onRetry,
  showEngineInfo = true,
  showScores = false,
  className = ''
}: ExtSearchResultsProps) {
  // Loading state
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg p-4 space-y-2">
              <div className="h-5 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start space-x-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div className="flex-1">
            <h3 className="text-red-900 font-medium mb-1">Search Error</h3>
            <p className="text-red-700 text-sm">{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Try again →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No results
  if (!response || response.results.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <span className="text-4xl mb-3 block">🔍</span>
        <h3 className="text-gray-900 font-medium mb-1">No results found</h3>
        <p className="text-gray-600 text-sm">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  const { results, meta } = response;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Engine status summary */}
      {showEngineInfo && meta.engines.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-900">
              Searched {meta.engines.filter(e => e.success).length} of {meta.engines.length} engines
            </span>
            <span className="text-blue-700">
              {meta.totalMs}ms • {meta.totalResults} total results
            </span>
          </div>
          {meta.partial && (
            <p className="text-orange-600 text-xs mt-1">
              ⚠️ Some search engines failed or timed out
            </p>
          )}
        </div>
      )}

      {/* Search results */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.engine}-${index}`}
            result={result}
            showScore={showScores}
          />
        ))}
      </div>

      {/* Engine breakdown */}
      {showEngineInfo && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Engine Performance</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {meta.engines.map(engine => (
              <div
                key={engine.id}
                className={`text-xs p-2 rounded ${
                  engine.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <div className="font-medium">{engine.name}</div>
                <div className="opacity-75">
                  {engine.success
                    ? `${engine.resultCount} results • ${engine.latencyMs}ms`
                    : engine.error || 'Failed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual result card component
 */
function ResultCard({
  result,
  showScore
}: {
  result: ExtSearchResultItem;
  showScore: boolean;
}) {
  const getEngineColor = (engine: string): string => {
    const colors: Record<string, string> = {
      searchmysite: 'bg-purple-100 text-purple-700',
      searxng: 'bg-blue-100 text-blue-700',
      brave: 'bg-orange-100 text-orange-700',
      mojeek: 'bg-green-100 text-green-700'
    };
    return colors[engine] || 'bg-gray-100 text-gray-700';
  };

  const getContentTypeIcon = (type?: string): string => {
    switch (type) {
      case 'blog': return '📝';
      case 'forum': return '💬';
      case 'personal': return '👤';
      case 'wiki': return '📚';
      case 'commercial': return '🛒';
      default: return '🌐';
    }
  };

  const getDomain = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start space-x-3">
        {/* Icon and badges */}
        <div className="flex-shrink-0 pt-1">
          <span className="text-xl">{getContentTypeIcon(result.contentType)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and URL */}
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
            {result.title}
          </h3>
          <div className="text-xs text-green-600 mb-2 truncate">
            {getDomain(result.url)}
          </div>

          {/* Snippet */}
          {result.snippet && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {result.snippet}
            </p>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Engine badge */}
            <span className={`px-2 py-0.5 rounded ${getEngineColor(result.engine)}`}>
              {result.engine}
            </span>

            {/* Privacy indicators */}
            {result.isIndieWeb && (
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                🌱 Indie Web
              </span>
            )}

            {result.privacyScore && result.privacyScore > 0.7 && (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                🔒 Privacy
              </span>
            )}

            {result.hasTrackers === false && (
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                No trackers
              </span>
            )}

            {/* Ring member indicator */}
            {result.engineMetadata?.isRingMember && (
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                🔗 Ring Member
              </span>
            )}

            {/* Score (if enabled) */}
            {showScore && result.score !== undefined && (
              <span className="text-gray-500">
                Score: {(result.score * 100).toFixed(0)}%
              </span>
            )}

            {/* Published date */}
            {result.publishedDate && (
              <span className="text-gray-500">
                {new Date(result.publishedDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

export default ExtSearchResults;