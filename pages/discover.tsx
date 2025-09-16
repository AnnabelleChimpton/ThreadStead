import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import Link from 'next/link';
import { useExtSearch } from '@/hooks/useExtSearch';
import { ExtSearchResults } from '@/components/features/search/ExtSearchResults';
import SurpriseMeButton from '@/components/features/search/SurpriseMeButton';
import DiscoverPageSearch from '@/components/features/search/DiscoverPageSearch';

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
  const [searchTab, setSearchTab] = useState<'local' | 'smallweb'>('local');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentRings, setRecentRings] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // External search state
  const [indieOnly, setIndieOnly] = useState(false);
  const [privacyOnly, setPrivacyOnly] = useState(false);
  const [noTrackers, setNoTrackers] = useState(false);

  // Use external search hook (manual mode)
  const extSearch = useExtSearch(searchQuery, {
    enabled: false, // Disable automatic searching
    filters: {
      indieOnly,
      privacyOnly,
      noTrackers
    }
  });

  // Check for search query in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    const typeParam = urlParams.get('type') as 'all' | 'threadrings' | 'users' | 'posts';
    const tabParam = urlParams.get('tab') as 'local' | 'smallweb';

    if (queryParam) {
      setSearchQuery(queryParam);
      if (typeParam && ['all', 'threadrings', 'users', 'posts'].includes(typeParam)) {
        setSearchType(typeParam);
      }
      if (tabParam && ['local', 'smallweb'].includes(tabParam)) {
        setSearchTab(tabParam);
      }

      // Trigger search automatically if there's a query in URL
      if (tabParam === 'smallweb' && extSearchEnabled) {
        // Trigger external search after a short delay to ensure hook is ready
        setTimeout(() => {
          extSearch.search();
        }, 100);
      } else {
        // For local search (either explicit 'local' or no tab specified)
        performSearch(queryParam, typeParam || 'all');
      }
    }
  }, []); // Empty dependency array - only run on mount

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load recent threadrings
        const ringsResponse = await fetch('/api/threadrings?limit=6&sortBy=recent');
        if (ringsResponse.ok) {
          const ringsData = await ringsResponse.json();
          setRecentRings(ringsData.threadrings || []);
        }

        // Load active users
        const usersResponse = await fetch('/api/directory?limit=6&sortBy=active');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setActiveUsers(usersData.users || []);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const performSearch = async (query: string, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        type: type,
        limit: '20'
      });

      const response = await fetch(`/api/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    console.log('handleSearch called with:', { searchQuery, searchTab, extSearchEnabled });

    try {
      // Update URL with search parameters
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        tab: searchTab
      });
      window.history.pushState({}, '', `/discover?${params}`);

      // Perform appropriate search
      if (searchTab === 'local') {
        await performSearch(searchQuery, searchType);
      } else if (searchTab === 'smallweb' && extSearchEnabled) {
        // Manually trigger external search
        console.log('Triggering external search for:', searchQuery);
        await extSearch.search();
      }

      console.log('Search completed successfully');
    } catch (error) {
      console.error('Search failed:', error);
    }
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
          <p className="text-gray-600 mb-4">
            Explore ThreadRings, find interesting people, and discover great content
          </p>
          <SurpriseMeButton className="mt-4" />
        </div>

        {/* Enhanced Search Interface */}
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
          onSearch={handleSearch}
          loading={searchTab === 'local' ? loading : extSearch.loading}
          extSearchEnabled={extSearchEnabled}
          className="mb-8"
        />

        {/* Search Results */}
        {searchTab === 'local' && results.length > 0 && (
          <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#2E4B3F]">Local Results</h2>
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
                      {result.meta && (
                        <p className="text-xs text-gray-500 mt-1">{result.meta}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* External Search Results */}
        {searchTab === 'smallweb' && searchQuery && (
          <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#2E4B3F]">Small Web Results</h2>
            <ExtSearchResults
              response={extSearch.data}
              loading={extSearch.loading}
              error={extSearch.error}
              onRetry={extSearch.refetch}
              showEngineInfo={true}
              showScores={false}
            />
          </div>
        )}

        {/* Browse Categories - Only show when no active search */}
        {!searchQuery && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent ThreadRings */}
            <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2E4B3F]">🔗 Recent ThreadRings</h2>
                <Link
                  href="/threadrings"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {recentRings.slice(0, 5).map((ring) => (
                  <Link
                    key={ring.id}
                    href={`/rings/${ring.slug}`}
                    className="block p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">🔗</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{ring.name}</h3>
                        {ring.description && (
                          <p className="text-sm text-gray-600 truncate">{ring.description}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Active Users */}
            <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2E4B3F]">👤 Active Community</h2>
                <Link
                  href="/directory"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {activeUsers.slice(0, 5).map((user) => (
                  <Link
                    key={user.id}
                    href={`/resident/${user.username}`}
                    className="block p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={`${user.displayName || user.username}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {(user.displayName || user.username || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {user.displayName || user.username}
                        </h3>
                        {user.bio && (
                          <p className="text-sm text-gray-600 truncate">{user.bio}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Browse Links */}
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold text-[#2E4B3F] mb-4">Quick Browse</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/feed"
              className="px-4 py-2 bg-orange-200 border border-[#A18463] rounded-lg hover:bg-orange-100 shadow-[2px_2px_0_#A18463] font-medium transition-colors"
            >
              📰 Community Feed
            </Link>
            <Link
              href="/threadrings"
              className="px-4 py-2 bg-purple-200 border border-[#A18463] rounded-lg hover:bg-purple-100 shadow-[2px_2px_0_#A18463] font-medium transition-colors"
            >
              🔗 All ThreadRings
            </Link>
            <Link
              href="/directory"
              className="px-4 py-2 bg-green-200 border border-[#A18463] rounded-lg hover:bg-green-100 shadow-[2px_2px_0_#A18463] font-medium transition-colors"
            >
              👥 Member Directory
            </Link>
            <Link
              href="/pixel-homes"
              className="px-4 py-2 bg-blue-200 border border-[#A18463] rounded-lg hover:bg-blue-100 shadow-[2px_2px_0_#A18463] font-medium transition-colors"
            >
              🏠 Pixel Homes
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<DiscoverProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);
  const extSearchEnabled = process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH === 'true';

  return {
    props: {
      siteConfig,
      extSearchEnabled,
      ...(user && {
        user: {
          id: user.id,
          did: user.did,
          role: user.role,
          primaryHandle: user.primaryHandle,
        }
      })
    },
  };
};