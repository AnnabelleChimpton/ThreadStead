/**
 * Enhanced Community Browser Component
 * Combines search, browsing, filtering, rating, and discovery features
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBookmarks } from '@/hooks/useBookmarks';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface Communitysite {
  id: string;
  url: string;
  title: string;
  description?: string;
  communityScore: number;
  siteType?: string;
  tags: string[];
  discoveredAt: string;
  communityValidated: boolean;
  discoveryMethod?: string;
  matchScore?: number;
  discoveredBy?: { handle: string };
  recentActivity: { discoveries: number };
}

interface EnhancedCommunityBrowserProps {
  query: string;
  includeUnvalidated: boolean;
  user?: {
    id: string;
    primaryHandle: string | null;
  } | null;
}

export default function EnhancedCommunityBrowser({
  query,
  includeUnvalidated,
  user
}: EnhancedCommunityBrowserProps) {
  const [sites, setSites] = useState<Communitysite[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'browse'>('search');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Browse mode states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'alphabetical'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Use bookmarks hook
  const { saving, saveFromCommunityIndex } = useBookmarks();

  // Search mode states
  const [searchResults, setSearchResults] = useState<any>(null);

  const categories = [
    { value: 'all', label: 'All Categories', icon: 'map' },
    { value: 'PERSONAL_BLOG', label: 'Personal Blogs', icon: 'article' },
    { value: 'TECHNICAL_BLOG', label: 'Tech Blogs', icon: 'code' },
    { value: 'PORTFOLIO', label: 'Portfolios', icon: 'image' },
    { value: 'DIGITAL_GARDEN', label: 'Digital Gardens', icon: 'drop' },
    { value: 'CREATIVE_SHOWCASE', label: 'Creative', icon: 'image' },
    { value: 'COMMUNITY_SITE', label: 'Communities', icon: 'users' },
    { value: 'TOOL_OR_SERVICE', label: 'Tools & Services', icon: 'sliders' },
    { value: 'OTHER', label: 'Other', icon: 'archive' }
  ];

  // Determine mode based on query
  useEffect(() => {
    setMode(query ? 'search' : 'browse');
    setCurrentPage(1); // Reset pagination when mode changes
  }, [query]);

  // Search when in search mode
  useEffect(() => {
    if (mode === 'search' && query) {
      performSearch();
    }
  }, [query, includeUnvalidated, mode]);

  // Browse when in browse mode - trigger on mount and when parameters change
  useEffect(() => {
    if (mode === 'browse') {
      loadBrowseData();
    }
  }, [selectedCategory, sortBy, currentPage, includeUnvalidated, mode]);

  const performSearch = async () => {
    if (!query) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        validationStatus: includeUnvalidated ? 'all' : 'validated',
        limit: '20'
      });

      const response = await fetch(`/api/community-index/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setSites(data.results || []);
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Community search failed:', error);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBrowseData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        sortBy,
        page: currentPage.toString(),
        limit: '15',
        validationStatus: includeUnvalidated ? 'all' : 'validated'
      });

      const response = await fetch(`/api/community-index/browse?${params}`);
      const data = await response.json();

      if (data.success) {
        setSites(data.sites || []);
        setTotalPages(Math.ceil(data.total / 15));
      }
    } catch (error) {
      console.error('Community browse failed:', error);
      // Fallback to basic community integration
      try {
        const response = await fetch(`/api/community-index/feeds?type=recent&limit=15`);
        const fallbackData = await response.json();
        if (fallbackData.success) {
          // The feeds API returns data in feed property, not sites
          setSites(fallbackData.feed?.sites || []);
          setTotalPages(1);
        }
      } catch (fallbackError) {
        console.error('Fallback browse failed:', fallbackError);
        setSites([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSiteClick = async (site: Communitysite) => {
    try {
      await fetch('/api/community-index/track-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromSite: window.location.origin,
          toSite: site.url,
          discoveryMethod: mode === 'search' ? 'community_search' : 'community_browse',
          metadata: {
            query: mode === 'search' ? query : undefined,
            category: mode === 'browse' ? selectedCategory : undefined,
            siteId: site.id
          }
        })
      });
    } catch (error) {
      console.warn('Failed to track community discovery:', error);
    }

    window.open(site.url, '_blank');
  };

  // Remove voting function - replaced with more intentional actions

  const SiteCard = ({ site }: { site: Communitysite }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
      {/* Main content area - full width for title */}
      <div className="cursor-pointer" onClick={() => handleSiteClick(site)}>
        <div className="mb-2">
          <h3 className="font-semibold text-blue-600 hover:text-blue-700 line-clamp-2 break-words mb-2">
            {site.title}
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {site.communityValidated && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                ✓ Verified
              </span>
            )}
            {site.discoveryMethod === 'manual_submit' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                <PixelIcon name="user" size={12} />
                Human Pick
              </span>
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">{new URL(site.url).hostname}</p>
        {site.description && (
          <p className="text-gray-700 mb-3 line-clamp-3 sm:line-clamp-2 text-xs sm:text-sm">{site.description}</p>
        )}
      </div>

      {/* Bottom section with metadata and actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-1">
          <span>Score: {site.communityScore}</span>
          <span>•</span>
          <span>{new Date(site.discoveredAt).toLocaleDateString()}</span>
        </div>

        {/* Compact action buttons at bottom */}
        <div className="flex gap-1.5 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSiteClick(site);
            }}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Visit this site"
          >
            Visit
          </button>
          {user && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
              }}
              disabled={saving}
              className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="Save to your bookmarks"
            >
              {saving ? '...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-[#2E4B3F] flex items-center gap-2">
          <PixelIcon name="bookmark" size={20} />
          Community Index
        </h2>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 text-xs sm:text-sm rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs sm:text-sm rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('search')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors flex items-center gap-1 ${
                mode === 'search'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">
                <PixelIcon name="search" size={16} />
              </span>
              Search
            </button>
            <button
              onClick={() => setMode('browse')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors flex items-center gap-1 ${
                mode === 'browse'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">
                <PixelIcon name="folder" size={16} />
              </span>
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Browse Mode Controls */}
      {mode === 'browse' && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center">
            <div className="flex-1 sm:flex-none">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto border border-gray-300 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 sm:flex-none">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto border border-gray-300 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
              >
                <option value="score">Community Score</option>
                <option value="recent">Recently Discovered</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span>
                {sites.length} sites • Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search Mode Info */}
      {mode === 'search' && query && searchResults && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Found {searchResults.pagination?.total || sites.length} sites matching &quot;{query}&quot;
            {searchResults.searchMeta?.executionTime && (
              <span className="text-blue-600"> ({searchResults.searchMeta.executionTime}ms)</span>
            )}
          </p>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {mode === 'search' ? 'Searching community sites...' : 'Loading community sites...'}
          </p>
        </div>
      ) : (
        <>
          {sites.length > 0 ? (
            <>
              <div className={
                viewMode === 'cards'
                  ? 'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-3'
              }>
                {sites.map((site) => (
                  <SiteCard key={site.id} site={site} />
                ))}
              </div>

              {/* Pagination for browse mode */}
              {mode === 'browse' && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 ${
                            currentPage === pageNum ? 'bg-blue-500 text-white border-blue-500' : ''
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {mode === 'search' ? (
                query ? (
                  <>
                    <p className="mb-4">No community sites found matching &quot;{query}&quot;.</p>
                    <button
                      onClick={() => setMode('browse')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Browse all community sites instead
                    </button>
                  </>
                ) : (
                  <p>Enter a search query to find community sites.</p>
                )
              ) : (
                <p>No sites found for the selected category and filters.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Help Text */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1">
            <PixelIcon name="lightbulb" size={12} />
            Discover great sites from our community
          </span>
          <Link href="/community-index/submit" className="text-blue-600 hover:underline flex items-center gap-1">
            <PixelIcon name="plus" size={12} />
            Submit a site
          </Link>
          <Link href="/community-index/validate" className="text-blue-600 hover:underline flex items-center gap-1">
            <PixelIcon name="check" size={12} />
            Help validate submissions
          </Link>
          {!user && (
            <span className="text-blue-600">
              <Link href="/auth/signin" className="hover:underline">
                Sign in to save sites
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}