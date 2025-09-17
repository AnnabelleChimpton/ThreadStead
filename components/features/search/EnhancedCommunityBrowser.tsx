/**
 * Enhanced Community Browser Component
 * Combines search, browsing, filtering, rating, and discovery features
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'alphabetical'>('score');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search mode states
  const [searchResults, setSearchResults] = useState<any>(null);

  const categories = [
    { value: 'all', label: 'All Categories', emoji: '🌍' },
    { value: 'PERSONAL_BLOG', label: 'Personal Blogs', emoji: '📖' },
    { value: 'TECHNICAL_BLOG', label: 'Tech Blogs', emoji: '💻' },
    { value: 'PORTFOLIO', label: 'Portfolios', emoji: '🎨' },
    { value: 'DIGITAL_GARDEN', label: 'Digital Gardens', emoji: '🌱' },
    { value: 'CREATIVE_SHOWCASE', label: 'Creative', emoji: '✨' },
    { value: 'COMMUNITY_SITE', label: 'Communities', emoji: '👥' },
    { value: 'TOOL_OR_SERVICE', label: 'Tools & Services', emoji: '🛠️' },
    { value: 'OTHER', label: 'Other', emoji: '📦' }
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

  // Browse when in browse mode
  useEffect(() => {
    if (mode === 'browse') {
      loadBrowseData();
    }
  }, [selectedCategory, sortBy, currentPage, includeUnvalidated, mode]);

  const performSearch = useCallback(async () => {
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
  }, [query, includeUnvalidated]);

  const loadBrowseData = useCallback(async () => {
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
          setSites(fallbackData.sites || []);
          setTotalPages(1);
        }
      } catch (fallbackError) {
        console.error('Fallback browse failed:', fallbackError);
        setSites([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortBy, currentPage, includeUnvalidated]);

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

  const handleVote = async (siteId: string, voteType: 'up' | 'down') => {
    if (!user) {
      alert('Please log in to vote on sites');
      return;
    }

    try {
      const response = await fetch('/api/community-index/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, voteType })
      });

      if (response.ok) {
        // Refresh the data to show updated scores
        if (mode === 'search') {
          performSearch();
        } else {
          loadBrowseData();
        }
      }
    } catch (error) {
      console.error('Vote failed:', error);
    }
  };

  const SiteCard = ({ site }: { site: Communitysite }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 cursor-pointer" onClick={() => handleSiteClick(site)}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-blue-600 hover:text-blue-700 line-clamp-1">
              {site.title}
            </h3>
            {site.communityValidated && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✓ Validated
              </span>
            )}
            {site.communityScore > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Score: {site.communityScore}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{new URL(site.url).hostname}</p>
          {site.description && (
            <p className="text-gray-700 mb-3 line-clamp-2 text-sm">{site.description}</p>
          )}
        </div>

        {/* Voting buttons */}
        {user && (
          <div className="flex flex-col items-center gap-1 ml-3">
            <button
              onClick={() => handleVote(site.id, 'up')}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Upvote this site"
            >
              ▲
            </button>
            <span className="text-xs font-medium text-gray-600">{site.communityScore}</span>
            <button
              onClick={() => handleVote(site.id, 'down')}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Downvote this site"
            >
              ▼
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <div className="flex items-center gap-3">
          {site.siteType && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {site.siteType.replace('_', ' ')}
            </span>
          )}
          <span>Found {new Date(site.discoveredAt).toLocaleDateString()}</span>
          {site.discoveredBy && (
            <span>by @{site.discoveredBy.handle}</span>
          )}
        </div>
        {site.recentActivity?.discoveries > 0 && (
          <span className="text-blue-600">
            {site.recentActivity.discoveries} recent discoveries
          </span>
        )}
      </div>

      {site.tags && site.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {site.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
          {site.tags.length > 5 && (
            <span className="text-gray-500 text-xs">
              +{site.tags.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#2E4B3F]">🌟 Community Index</h2>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-sm rounded transition-colors ${
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
              className={`px-3 py-1 text-sm rounded transition-colors ${
                mode === 'search'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setMode('browse')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                mode === 'browse'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📂 Browse
            </button>
          </div>
        </div>
      </div>

      {/* Browse Mode Controls */}
      {mode === 'browse' && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="score">Community Score</option>
                <option value="recent">Recently Discovered</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
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
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
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
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                          className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 ${
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
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
          <span>💡 Tip: Click ▲/▼ to rate sites and help improve community rankings</span>
          {!user && (
            <span className="text-blue-600">
              <Link href="/auth/signin" className="hover:underline">
                Sign in to vote and rate sites
              </Link>
            </span>
          )}
          <Link href="/community-index/submit" className="text-blue-600 hover:underline">
            ➕ Submit a site
          </Link>
        </div>
      </div>
    </div>
  );
}