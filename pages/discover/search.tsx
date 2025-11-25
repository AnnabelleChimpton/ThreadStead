import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
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
import { useBookmarks } from '@/hooks/useBookmarks';
import { contentMetadataGenerator } from '@/lib/utils/metadata/content-metadata';
import UserMention from '@/components/ui/navigation/UserMention';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { QuickSubmitWidget } from '@/components/features/search/QuickSubmitWidget';

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
  const resultsRef = useRef<HTMLDivElement>(null);

  // Generate metadata for discover page
  const discoverMetadata = contentMetadataGenerator.generateDiscoverMetadata(searchQuery || undefined);
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

  // Auto-scroll to results when they populate
  useEffect(() => {
    if (!loading && searchQuery && (communityResults.length > 0 || localResults.length > 0 || externalResults?.results?.length > 0 || results.length > 0)) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading, communityResults, localResults, externalResults, results, searchQuery]);

  // Use auto-indexer hook
  const { trackAndIndex } = useAutoIndexer(searchQuery);

  // Use bookmarks hook
  const { saving, error: saveError, saveFromCommunityIndex, saveFromSiteContent, saveFromExternalSearch } = useBookmarks();

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
        sourceIconName: 'bookmark' as const,
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
        sourceIconName: 'home' as const,
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
          sourceIconName: 'map' as const,
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
    if (result.discoveredBy) score += 15; // Boost user-discovered sites!
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
      case 'threadring': return <PixelIcon name="link" size={16} />;
      case 'user': return <PixelIcon name="user" size={16} />;
      case 'post': return <PixelIcon name="edit" size={16} />;
      default: return <PixelIcon name="search" size={16} />;
    }
  };

  return (
    <>
      <Head>
        <title>{discoverMetadata.title}</title>
        <meta name="description" content={discoverMetadata.description} />
        {discoverMetadata.keywords && (
          <meta name="keywords" content={discoverMetadata.keywords.join(', ')} />
        )}
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${discoverMetadata.url}`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={discoverMetadata.title} />
        <meta property="og:description" content={discoverMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${discoverMetadata.url}`} />
        <meta property="og:site_name" content="ThreadStead" />
        <meta property="og:locale" content="en_US" />

        {/* Social media card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={discoverMetadata.title} />
        <meta name="twitter:description" content={discoverMetadata.description} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(discoverMetadata.structuredData, null, 0)
          }}
        />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="text-center mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2E4B3F] mb-2">
              Explore the Neighborhood
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-2 px-2">
              Wander through our cozy corner of the internet - from community gems to hidden treasures of the world wide web
            </p>
            <Link href="/discover/faq" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <PixelIcon name="lightbulb" size={16} />
              <span>Discover how our community is mapping the indie web together</span>
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

            {/* Quick Submit Widget - Always visible to encourage submissions */}
            <div className="mt-4">
              <QuickSubmitWidget />
            </div>
          </div>

          <div ref={resultsRef} className="scroll-mt-4"></div>

          {/* All Tab - Unified Results with Pagination */}
          {searchTab === 'all' && searchQuery && (
            <div className="space-y-4">
              {(() => {
                const unifiedData = createUnifiedResults();

                if (unifiedData.totalResults === 0 && !loading) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      Hmm, nothing turned up. Maybe try different keywords or explore our community picks below?
                    </div>
                  );
                }

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <PixelIcon name="zap" size={20} /> Your Search Results
                      </h3>
                      <div className="text-xs text-gray-500">
                        Page {currentPage} of {unifiedData.totalPages} • {unifiedData.totalResults} gems found
                      </div>
                    </div>

                    <div className="space-y-3">
                      {unifiedData.results.map((result, index) => {
                        const globalIndex = (currentPage - 1) * resultsPerPage + index + 1;
                        return (
                          <div
                            key={`${result.source}-${result.id || result.url || index}`}
                            className="p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 cursor-pointer" onClick={result.clickHandler}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900 break-words">
                                    {result.title}
                                  </h4>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-flex items-center gap-1 self-start sm:self-auto flex-shrink-0">
                                    <PixelIcon name={result.sourceIconName} size={12} /> {result.source === 'community' ? 'Neighborhood' : result.source === 'site' ? 'Our Site' : result.source === 'external' ? 'Wild Web' : result.sourceLabel}
                                  </span>
                                </div>

                                {(result.description || result.snippet) && (
                                  <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-3 break-words">
                                    {result.description || result.snippet}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-gray-500">
                                  <span>#{globalIndex}</span>
                                  {result.source === 'community' && (
                                    <>
                                      <span>Score: {result.communityScore}</span>
                                      <span>{result.siteType?.replace('_', ' ')}</span>
                                      {result.communityValidated && <span className="text-green-600 flex items-center gap-1"><PixelIcon name="check" size={12} /> Community approved</span>}
                                      {result.discoveredBy && (
                                        <span className="text-blue-600 flex items-center gap-1 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                          <PixelIcon name="user" size={10} /> Discovered by @{result.discoveredBy.handle}
                                        </span>
                                      )}
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
                                      {result.isIndieWeb && <span className="text-purple-600 flex items-center gap-1"><PixelIcon name="drop" size={12} /> Indie spirit</span>}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-center gap-2 ml-2 sm:ml-4">
                                {user && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      let saveResult;

                                      if (result.source === 'community') {
                                        saveResult = await saveFromCommunityIndex(result);
                                      } else if (result.source === 'site') {
                                        saveResult = await saveFromSiteContent(result);
                                      } else if (result.source === 'external') {
                                        saveResult = await saveFromExternalSearch(result, searchQuery);
                                      }
                                    }}
                                    disabled={saving}
                                    className="px-2 py-1 text-[10px] sm:text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                    title="Save to your bookmarks"
                                  >
                                    {saving ? '...' : <PixelIcon name="save" size={12} />}
                                  </button>
                                )}
                                <div className="text-xs text-gray-400 hidden sm:block">
                                  {Math.round(result.unifiedScore)}
                                </div>
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
                          ← Back
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
                                className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 ${currentPage === pageNum ? 'bg-blue-500 text-white border-blue-500' : ''
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
                          More →
                        </button>
                      </div>
                    )}

                    {/* Source breakdown */}
                    <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2 sm:gap-4">
                        <span>Found in:</span>
                        {communityResults.length > 0 && (
                          <span className="flex items-center gap-1"><PixelIcon name="bookmark" size={12} /> {communityResults.length} neighborhood</span>
                        )}
                        {localResults.length > 0 && (
                          <span className="flex items-center gap-1"><PixelIcon name="home" size={12} /> {localResults.length} our site</span>
                        )}
                        {externalResults?.results?.length > 0 && (
                          <span className="flex items-center gap-1"><PixelIcon name="map" size={12} /> {externalResults.results.length} wild web</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            window.open('/discover/faq#how-search-works', '_blank');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline sm:ml-auto flex items-center gap-1 touch-manipulation"
                          title="Curious how we find and rank all this stuff?"
                        >
                          <PixelIcon name="lightbulb" size={12} />
                          <span>How we find stuff</span>
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
              <h2 className="text-xl font-bold mb-4 text-[#2E4B3F]">From Our Site</h2>
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
              <h2 className="text-xl font-bold mb-4 text-[#2E4B3F]">From the Wild Web</h2>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <PixelIcon name="drop" size={12} /> Found something interesting? Clicking will help us grow our community index together
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
                  searchQuery={searchQuery}
                  searchTab={searchTab}
                  user={user}
                />
              </div>
            </div>
          )}

          {/* Browse Categories - Only show when no active search */}
          {!searchQuery && searchTab === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Community Index Highlights */}
              <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#2E4B3F]">Neighborhood Favorites</h2>
                  <Link
                    href="/community-index/discover"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Browse →
                  </Link>
                </div>
                <CommunityIndexIntegration limit={3} user={user} />
              </div>

              {/* Recent ThreadRings */}
              <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#2E4B3F]">Recent Rings</h2>
                  <Link
                    href="/threadrings"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentRings.map((ring) => (
                    <Link
                      key={ring.id}
                      href={`/tr/${ring.slug}`}
                      className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <PixelIcon name="link" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{ring.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{ring.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Active Users */}
              <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#2E4B3F]">Active Neighbors</h2>
                  <Link
                    href="/directory"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Directory →
                  </Link>
                </div>
                <div className="space-y-3">
                  {activeUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors">
                      <UserMention
                        username={u.primaryHandle || 'user'}
                        showBadge={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}