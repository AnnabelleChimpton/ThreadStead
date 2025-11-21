/**
 * External Search Results Component
 * Displays results from the privacy-focused meta-search
 */

import React from 'react';
import type { ExtSearchResponse, ExtSearchResultItem } from '@/lib/extsearch/types';
import { useBookmarks } from '@/hooks/useBookmarks';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface ExtSearchResultsProps {
  response: ExtSearchResponse | null;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  showEngineInfo?: boolean;
  showScores?: boolean;
  className?: string;
  searchQuery?: string;
  searchTab?: string;
  user?: { id: string } | null;
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
  className = '',
  searchQuery,
  searchTab,
  user
}: ExtSearchResultsProps) {
  const { saving, saveFromExternalSearch } = useBookmarks();
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
          <span className="text-red-500">
            <PixelIcon name="warning-box" size={20} />
          </span>
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
        <div className="mb-3">
          <PixelIcon name="search" size={48} className="mx-auto text-gray-400" />
        </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-1">
            <span className="text-blue-900">
              Searched {meta.engines.filter(e => e.success).length} of {meta.engines.length} engines
            </span>
            <span className="text-blue-700">
              {meta.totalMs}ms • {meta.totalResults} total
            </span>
          </div>
          {meta.partial && (
            <p className="text-orange-600 text-xs mt-1 flex items-center gap-1">
              <PixelIcon name="warning-box" size={12} />
              Some search engines failed or timed out
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
            searchQuery={searchQuery}
            searchTab={searchTab}
            user={user}
            saving={saving}
            saveFromExternalSearch={saveFromExternalSearch}
          />
        ))}
      </div>

      {/* Engine breakdown */}
      {showEngineInfo && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">Engine Performance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
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
  showScore,
  searchQuery,
  searchTab,
  user,
  saving,
  saveFromExternalSearch
}: {
  result: ExtSearchResultItem;
  showScore: boolean;
  searchQuery?: string;
  searchTab?: string;
  user?: { id: string } | null;
  saving: boolean;
  saveFromExternalSearch: (result: any, searchQuery?: string) => Promise<any>;
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
      case 'blog': return 'article';
      case 'forum': return 'chat';
      case 'personal': return 'user';
      case 'wiki': return 'script';
      case 'commercial': return 'store';
      default: return 'map';
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

  const handleClick = async (e: React.MouseEvent) => {
    // Allow Ctrl+click, Cmd+click, middle click, etc. to work normally
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      return;
    }

    e.preventDefault();

    // Track the click and potentially submit to community index
    try {
      const response = await fetch('/api/community-index/track-click-and-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          searchQuery,
          searchTab,
          sessionId: Date.now().toString() // Simple session ID
        })
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }

    // Open the link
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      // Could show login modal here
      alert('Please log in to save bookmarks');
      return;
    }

    try {
      await saveFromExternalSearch(result, searchQuery);
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Main clickable content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
          <div className="flex items-start space-x-2 sm:space-x-3">
            {/* Icon and badges */}
            <div className="flex-shrink-0 pt-1 hidden sm:block">
              <PixelIcon name={getContentTypeIcon(result.contentType) as any} size={20} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title and URL */}
              <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 sm:line-clamp-1 break-words">
                {result.title}
              </h3>
              <div className="text-xs text-green-600 mb-2 break-all sm:truncate">
                {getDomain(result.url)}
              </div>

              {/* Snippet */}
              {result.snippet && (
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 sm:line-clamp-2 mb-2 break-words">
                  {result.snippet}
                </p>
              )}

              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                {/* Engine badge */}
                <span className={`px-1.5 sm:px-2 py-0.5 rounded ${getEngineColor(result.engine)}`}>
                  {result.engine}
                </span>

                {/* Privacy indicators */}
                {result.isIndieWeb && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-1">
                    <span className="hidden sm:inline">
                      <PixelIcon name="drop" size={12} />
                    </span>
                    Indie
                  </span>
                )}

                {result.privacyScore && result.privacyScore > 0.7 && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                    <span className="hidden sm:inline">
                      <PixelIcon name="lock" size={12} />
                    </span>
                    Privacy
                  </span>
                )}

                {result.hasTrackers === false && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    No trackers
                  </span>
                )}

                {/* Ring member indicator */}
                {result.engineMetadata?.isRingMember && (
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                    <PixelIcon name="link" size={12} />
                    Ring Member
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
        </div>

        {/* Save button */}
        {user && (
          <div className="flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
              title="Save to bookmarks"
            >
              {saving ? (
                <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtSearchResults;