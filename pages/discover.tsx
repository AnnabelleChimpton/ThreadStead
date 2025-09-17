import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import Link from 'next/link';
import { useExtSearch } from '@/hooks/useExtSearch';
import { ExtSearchResults } from '@/components/features/search/ExtSearchResults';
import DiscoverPageSearch from '@/components/features/search/DiscoverPageSearch';
import CommunityIndexIntegration from '@/components/features/search/CommunityIndexIntegration';
import EnhancedCommunityBrowser from '@/components/features/search/EnhancedCommunityBrowser';
import { useAutoIndexer, IndexingNotification } from '@/components/features/search/AutoIndexer';

interface DiscoverProps {
  siteConfig: SiteConfig;
  user?: {
    id: string;
    did: string;
    role: string;
    primaryHandle: string | null;
  };
  extSearchEnabled: boolean;
}

interface SearchResult {
  type: 'threadring' | 'user' | 'post';
  id: string;
  title: string;
  description?: string;
  url: string;
  meta?: string;
}

export default function DiscoverPage({ siteConfig, user, extSearchEnabled }: DiscoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'threadrings' | 'users' | 'posts'>('all');
  const [searchTab, setSearchTab] = useState<'all' | 'indie' | 'site' | 'web'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [communityResults, setCommunityResults] = useState<any[]>([]);
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<any>(null);
  const [recentRings, setRecentRings] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(15);

  // External search state
  const [indieOnly, setIndieOnly] = useState(false);
  const [privacyOnly, setPrivacyOnly] = useState(false);
  const [noTrackers, setNoTrackers] = useState(false);

  // Community search state
  const [includeUnvalidated, setIncludeUnvalidated] = useState(false);

  // Use auto-indexer hook
  const { trackAndIndex } = useAutoIndexer();

  // Use external search hook (manual mode)
  const extSearch = useExtSearch(searchQuery, {
    enabled: false,
    filters: {
      indieOnly,
      privacyOnly,
      noTrackers,
    }
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Check for search query in URL parameters and auto-search
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    const rawTabParam = urlParams.get('tab');
    const typeParam = urlParams.get('type') as 'all' | 'threadrings' | 'users' | 'posts';
    const indieParam = urlParams.get('indie') === 'true';
    const privacyParam = urlParams.get('privacy') === 'true';
    const noTrackersParam = urlParams.get('noTrackers') === 'true';
    const includeUnvalidatedParam = urlParams.get('includeUnvalidated') === 'true';

    if (queryParam) {
      // Map legacy "community" tab to "indie" for backward compatibility
      const tabParam = rawTabParam === 'community' ? 'indie' : rawTabParam as 'all' | 'indie' | 'site' | 'web';
      const finalTab = (tabParam && ['all', 'indie', 'site', 'web'].includes(tabParam)) ? tabParam : 'all';
      const finalType = (typeParam && ['all', 'threadrings', 'users', 'posts'].includes(typeParam)) ? typeParam : 'all';

      // Set all state first
      setSearchQuery(queryParam);
      setSearchTab(finalTab);
      setSearchType(finalType);
      setIndieOnly(indieParam);
      setPrivacyOnly(privacyParam);
      setNoTrackers(noTrackersParam);
      setIncludeUnvalidated(includeUnvalidatedParam);

      // Perform search directly with URL parameters to avoid state timing issues
      const performUrlSearch = async () => {
        console.log('Performing URL search with:', { query: queryParam, tab: finalTab, type: finalType });

        if (finalTab === 'all') {
          // Search all sources in parallel
          setLoading(true);
          const promises = [];

          // Community search
          const validationStatus = includeUnvalidatedParam ? 'all' : 'validated';
          promises.push(
            fetch(`/api/community-index/search?q=${encodeURIComponent(queryParam)}&limit=1000&validationStatus=${validationStatus}`)
              .then(res => res.json())
              .then(data => setCommunityResults(data.results || []))
              .catch(error => {
                console.error('Community search failed:', error);
                setCommunityResults([]);
              })
          );

          // Local search
          promises.push(
            fetch(`/api/search?q=${encodeURIComponent(queryParam)}&type=${finalType}`)
              .then(res => res.json())
              .then(data => setLocalResults(data.results || []))
              .catch(error => {
                console.error('Local search failed:', error);
                setLocalResults([]);
              })
          );

          // External search if enabled
          if (extSearchEnabled) {
            promises.push(
              fetch(`/api/extsearch?q=${encodeURIComponent(queryParam)}&page=0&perPage=20`)
                .then(res => res.json())
                .then(data => setExternalResults({
                  results: data.results || [],
                  meta: {
                    totalResults: data.results?.length || 0,
                    pagesFetched: 1,
                    engines: data.meta?.engines || []
                  }
                }))
                .catch(error => {
                  console.error('External search failed:', error);
                  setExternalResults(null);
                })
            );
          }

          await Promise.allSettled(promises);
          setLoading(false);
        } else if (finalTab === 'site') {
          // Site search only
          setLoading(true);
          try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(queryParam)}&type=${finalType}`);
            const data = await response.json();
            setResults(data.results || []);
          } catch (error) {
            console.error('Site search failed:', error);
            setResults([]);
          } finally {
            setLoading(false);
          }
        } else if (finalTab === 'indie') {
          // Indie Index search only
          try {
            const validationStatus = includeUnvalidatedParam ? 'all' : 'validated';
            const response = await fetch(`/api/community-index/search?q=${encodeURIComponent(queryParam)}&limit=10&validationStatus=${validationStatus}`);
            const data = await response.json();
            setCommunityResults(data.results || []);
          } catch (error) {
            console.error('Community search failed:', error);
            setCommunityResults([]);
          }
        } else if (finalTab === 'web' && extSearchEnabled) {
          // External search only - will be handled by the extSearch hook
          // We'll trigger it after state is set
          setTimeout(() => {
            extSearch.search();
          }, 200);
        }
      };

      // Trigger search after a short delay to ensure component is ready
      setTimeout(performUrlSearch, 100);
    }
  }, [extSearchEnabled]); // Include extSearchEnabled in deps

  // Handle external search results updates
  useEffect(() => {
    if (searchTab === 'all' && extSearch.data) {
      setExternalResults(extSearch.data);
    }
  }, [extSearch.data, searchTab]);

  const loadInitialData = async () => {
    try {
      // Load recent ThreadRings
      const ringsRes = await fetch('/api/threadrings?limit=5&sort=recent');
      if (ringsRes.ok) {
        const ringsData = await ringsRes.json();
        setRecentRings(ringsData.threadRings || []);
      }

      // Load active users
      const usersRes = await fetch('/api/users?limit=5&sort=active');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setActiveUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const performSearch = async (query: string, type: string, returnResults = false) => {
    if (!returnResults) setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        type: type
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      // The search API returns results directly, not wrapped in success
      const searchResults = data.results || [];
      if (returnResults) {
        setLocalResults(searchResults);
      } else {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      if (!returnResults) setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!searchQuery.trim()) return;

    // Reset pagination on new search
    setCurrentPage(1);

    try {
      if (searchTab === 'all') {
        // Search all sources in parallel with higher limits
        setLoading(true);
        const promises = [];

        // Community search - get ALL results (no limit)
        const validationStatus = includeUnvalidated ? 'all' : 'validated';
        promises.push(
          fetch(`/api/community-index/search?q=${encodeURIComponent(searchQuery)}&limit=1000&validationStatus=${validationStatus}`)
            .then(res => res.json())
            .then(data => setCommunityResults(data.results || []))
            .catch(() => setCommunityResults([]))
        );

        // Local search
        promises.push(
          performSearch(searchQuery, searchType, true)
        );

        // External search if enabled - fetch multiple pages
        if (extSearchEnabled) {
          promises.push(
            fetchAllExternalResults(searchQuery)
              .then(data => setExternalResults(data))
              .catch(error => {
                console.error('External search failed:', error);
                setExternalResults(null);
              })
          );
        }

        await Promise.allSettled(promises);
        setLoading(false);
      } else if (searchTab === 'site') {
        await performSearch(searchQuery, searchType);
      } else if (searchTab === 'web' && extSearchEnabled) {
        await extSearch.search();
      } else if (searchTab === 'indie') {
        // Indie Index tab search is handled by CommunityIndexIntegration component
        // But we can trigger a search here too for consistency
        const validationStatus = includeUnvalidated ? 'all' : 'validated';
        const res = await fetch(`/api/community-index/search?q=${encodeURIComponent(searchQuery)}&limit=10&validationStatus=${validationStatus}`);
        const data = await res.json();
        setCommunityResults(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleExternalResultClick = (url: string, title: string, snippet?: string) => {
    // Track and auto-index when clicking external results
    trackAndIndex(url, title, snippet, 'external_search');
  };

  // Fetch external results with conservative approach
  const fetchAllExternalResults = async (query: string) => {
    try {
      // Start with page 0 (Brave Search only works with page 0 due to API limits)
      const response = await fetch(
        `/api/extsearch?q=${encodeURIComponent(query)}&page=0&perPage=20`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Note: Brave Search is configured to only work on page 0 to avoid 422 errors
        // SearchMySite and other engines may still provide results on additional pages
        // For now, we'll stick to single page to ensure reliability
        console.log(`External search returned ${data.results.length} results from ${data.meta?.engines?.length || 0} engines`);
      }

      return {
        results: data.results || [],
        meta: {
          totalResults: data.results?.length || 0,
          pagesFetched: 1,
          engines: data.meta?.engines || []
        }
      };
    } catch (error) {
      console.error('External search failed:', error);
      return {
        results: [],
        meta: {
          totalResults: 0,
          pagesFetched: 0
        }
      };
    }
  };

  // Unified result ranking function with pagination
  const createUnifiedResults = () => {
    const unifiedResults: any[] = [];

    // Add community results with scoring
    communityResults.forEach((result: any) => {
      unifiedResults.push({
        ...result,
        source: 'community',
        unifiedScore: calculateCommunityScore(result),
        sourceIcon: '🌟',
        sourceLabel: 'Community',
        clickHandler: () => trackAndIndex(result.url, result.title, result.description, 'community_index')
      });
    });

    // Add site results with scoring
    localResults.forEach((result: any) => {
      unifiedResults.push({
        ...result,
        source: 'site',
        unifiedScore: calculateSiteScore(result),
        sourceIcon: '🏠',
        sourceLabel: 'Site',
        clickHandler: () => window.open(result.url, '_blank')
      });
    });

    // Add external results with scoring
    if (externalResults?.results) {
      externalResults.results.forEach((result: any, index: number) => {
        unifiedResults.push({
          ...result,
          source: 'external',
          unifiedScore: calculateExternalScore(result, index),
          sourceIcon: '🌐',
          sourceLabel: 'Web',
          clickHandler: () => trackAndIndex(result.url, result.title, result.snippet, 'external_search')
        });
      });
    }

    // Sort by unified score (descending)
    const sortedResults = unifiedResults.sort((a, b) => b.unifiedScore - a.unifiedScore);

    // Calculate pagination
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const paginatedResults = sortedResults.slice(startIndex, endIndex);

    return {
      results: paginatedResults,
      totalResults: sortedResults.length,
      totalPages: Math.ceil(sortedResults.length / resultsPerPage),
      hasMore: endIndex < sortedResults.length
    };
  };

  // Scoring functions for different sources
  const calculateCommunityScore = (result: any) => {
    let score = 50; // Base score for community results
    score += (result.communityScore || 0) * 2; // Community score multiplier
    score += (result.matchScore || 0) * 0.5; // Text relevance
    if (result.communityValidated) score += 20; // Validated bonus
    return score;
  };

  const calculateSiteScore = (result: any) => {
    let score = 40; // Base score for site results
    // Boost based on type
    if (result.type === 'threadring') score += 15;
    if (result.type === 'user') score += 10;
    if (result.type === 'post') score += 5;
    return score;
  };

  const calculateExternalScore = (result: any, globalPosition: number) => {
    let score = 30; // Base score for external results

    // Position penalty based on global position across all external results
    score -= globalPosition * 1; // Lighter penalty since we have more results

    // Engine-specific bonuses
    if (result.isIndieWeb) score += 15; // Indie web bonus
    if (result.privacyScore > 0.7) score += 10; // Privacy bonus
    if (result.engine === 'searchmysite') score += 8; // Small web engine bonus
    if (result.engine === 'brave') score += 5; // Brave search bonus

    // Original position bonus (results from page 1 get higher scores)
    if (result.position <= 5) score += 5; // Top 5 results
    if (result.position <= 10) score += 2; // Top 10 results

    return Math.max(1, score); // Ensure minimum score of 1
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'threadring': return '🔗';
      case 'user': return '👤';
      case 'post': return '📝';
      default: return '🔍';
    }
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-6xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2E4B3F] mb-2">
            🔍 Discover
          </h1>
          <p className="text-gray-600 mb-2">
            Search across our community index, local content, and the broader indie web all in one place
          </p>
          <Link href="/discover/faq" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
            <span>💡</span>
            <span>Learn how we&apos;re building a community-driven search engine</span>
            <span>→</span>
          </Link>
        </div>

        {/* Enhanced Search Interface */}
        <div className="mb-6">
          <DiscoverPageSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchTab={searchTab}
            setSearchTab={setSearchTab}
            searchType={searchType}
            setSearchType={setSearchType}
            indieOnly={indieOnly}
            setIndieOnly={setIndieOnly}
            privacyOnly={privacyOnly}
            setPrivacyOnly={setPrivacyOnly}
            noTrackers={noTrackers}
            setNoTrackers={setNoTrackers}
            includeUnvalidated={includeUnvalidated}
            setIncludeUnvalidated={setIncludeUnvalidated}
            onSearch={handleSearch}
            loading={searchTab === 'site' ? loading : extSearch.loading}
            extSearchEnabled={extSearchEnabled}
            className="mb-4"
          />
        </div>

        {/* All Tab - Unified Results with Pagination */}
        {searchTab === 'all' && searchQuery && (
          <div className="space-y-4">
            {(() => {
              const unifiedData = createUnifiedResults();

              if (unifiedData.totalResults === 0 && !loading) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No results found. Try different search terms.
                  </div>
                );
              }

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      🔍 Best Results from All Sources
                    </h3>
                    <div className="text-xs text-gray-500">
                      Page {currentPage} of {unifiedData.totalPages} • {unifiedData.totalResults} total results
                    </div>
                  </div>

                  <div className="space-y-3">
                    {unifiedData.results.map((result, index) => {
                      const globalIndex = (currentPage - 1) * resultsPerPage + index + 1;
                      return (
                        <div
                          key={`${result.source}-${result.id || result.url || index}`}
                          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={result.clickHandler}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 line-clamp-1">
                                  {result.title}
                                </h4>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                                  {result.sourceIcon} {result.sourceLabel}
                                </span>
                              </div>

                              {(result.description || result.snippet) && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {result.description || result.snippet}
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>#{globalIndex}</span>
                                {result.source === 'community' && (
                                  <>
                                    <span>Score: {result.communityScore}</span>
                                    <span>{result.siteType?.replace('_', ' ')}</span>
                                    {result.communityValidated && <span className="text-green-600">✓ Validated</span>}
                                  </>
                                )}
                                {result.source === 'site' && (
                                  <span className="flex items-center gap-1">
                                    {getResultIcon(result.type)} {result.type}
                                  </span>
                                )}
                                {result.source === 'external' && (
                                  <>
                                    <span>via {result.engine}</span>
                                    {result.isIndieWeb && <span className="text-purple-600">🌱 IndieWeb</span>}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-xs text-gray-400 ml-4">
                              {Math.round(result.unifiedScore)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {unifiedData.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, unifiedData.totalPages) }, (_, i) => {
                          let pageNum;
                          if (unifiedData.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= unifiedData.totalPages - 2) {
                            pageNum = unifiedData.totalPages - 4 + i;
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
                        onClick={() => setCurrentPage(Math.min(unifiedData.totalPages, currentPage + 1))}
                        disabled={currentPage === unifiedData.totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Source breakdown */}
                  <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 flex items-center gap-4">
                      <span>Sources:</span>
                      {communityResults.length > 0 && (
                        <span>🌟 {communityResults.length} community</span>
                      )}
                      {localResults.length > 0 && (
                        <span>🏠 {localResults.length} site</span>
                      )}
                      {externalResults?.results?.length > 0 && (
                        <span>🌐 {externalResults.results.length} external</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const info = `
🔍 How Our Search Works - Transparency Report

📊 RANKING ALGORITHM:
• Community Index: Base score 50 + community validation bonus (+20)
• Site Content: Base score 40 + content type bonus (ThreadRings +15, Users +10, Posts +5)
• Web Results: Base score 30 + indie/privacy bonuses (+15/+10)

This ensures equitable representation across all sources!

🤖 AUTO-INDEXING:
• When you click external search results, they're automatically submitted for community review
• Sites are scored based on: domain reputation, privacy features, indie web signals
• Community members validate and rate submissions

✅ REVIEW PROCESS:
• New submissions start unvalidated
• Community reviews add validation scores
• Higher-scored sites appear more prominently
• Everyone can participate in curation!

💫 OUR ETHOS:
This is a community-driven project. We believe in:
• Transparency over black-box algorithms
• Community curation over corporate control
• Equitable access to discovery
• Supporting the indie web

Want to help? Submit sites, review submissions, or check our stats!
                          `.trim();
                          alert(info);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-auto flex items-center gap-1"
                        title="Click to learn how our search and ranking works"
                      >
                        <span>🔍</span>
                        <span>How this works</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Enhanced Indie Index */}
        {searchTab === 'indie' && (
          <EnhancedCommunityBrowser
            query={searchQuery}
            includeUnvalidated={includeUnvalidated}
            user={user}
          />
        )}

        {/* Site Search Results */}
        {searchTab === 'site' && results.length > 0 && (
          <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#2E4B3F]">Site Results</h2>
            <div className="space-y-3">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{getResultIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 truncate">{result.title}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                          {result.type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{result.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* External Search Results with Auto-indexing */}
        {searchTab === 'web' && searchQuery && (
          <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#2E4B3F]">Web Results</h2>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 Clicking results will automatically add them to our community review queue
              </p>
            </div>
            <div onClick={(e) => {
              // Intercept clicks on external results
              const target = e.target as HTMLElement;
              const link = target.closest('a');
              if (link && link.href) {
                e.preventDefault();
                const title = link.textContent || 'Untitled';
                const snippet = link.querySelector('.snippet')?.textContent;
                handleExternalResultClick(link.href, title, snippet);
              }
            }}>
              <ExtSearchResults
                response={extSearch.data}
                loading={extSearch.loading}
                error={extSearch.error}
                onRetry={extSearch.refetch}
                showEngineInfo={true}
                showScores={false}
              />
            </div>
          </div>
        )}

        {/* Browse Categories - Only show when no active search */}
        {!searchQuery && searchTab === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Community Index Highlights */}
            <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#2E4B3F]">🌟 Community Picks</h2>
                <Link
                  href="/community-index/discover"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Explore →
                </Link>
              </div>
              <CommunityIndexIntegration limit={3} />
            </div>

            {/* Recent ThreadRings */}
            <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#2E4B3F]">🔗 ThreadRings</h2>
                <Link
                  href="/threadrings"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {recentRings.slice(0, 3).map((ring) => (
                  <Link
                    key={ring.id}
                    href={`/rings/${ring.slug}`}
                    className="block p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900 truncate">{ring.name}</h3>
                  </Link>
                ))}
              </div>
            </div>

            {/* Active Users */}
            <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#2E4B3F]">👤 Active Users</h2>
                <Link
                  href="/directory"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {activeUsers.slice(0, 3).map((user) => (
                  <Link
                    key={user.id}
                    href={`/${user.primaryHandle}`}
                    className="block p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900 truncate">@{user.primaryHandle}</h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Indexing Notification */}
        <IndexingNotification />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      siteConfig,
      user: user ? {
        id: user.id,
        did: user.did,
        role: user.role,
        primaryHandle: user.primaryHandle
      } : null,
      extSearchEnabled: process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH === 'true'
    }
  };
};