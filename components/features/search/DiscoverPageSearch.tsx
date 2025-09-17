/**
 * Discover Page Search Component
 * Enhanced search for both local ThreadStead content and the wider indie web
 * Based on HomePageSearch but with additional controls for discover page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SurpriseMeButtonCompact } from './SurpriseMeButton';

interface DiscoverPageSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchTab: 'all' | 'indie' | 'site' | 'web';
  setSearchTab: (tab: 'all' | 'indie' | 'site' | 'web') => void;
  searchType: 'all' | 'threadrings' | 'users' | 'posts';
  setSearchType: (type: 'all' | 'threadrings' | 'users' | 'posts') => void;
  indieOnly: boolean;
  setIndieOnly: (value: boolean) => void;
  privacyOnly: boolean;
  setPrivacyOnly: (value: boolean) => void;
  noTrackers: boolean;
  setNoTrackers: (value: boolean) => void;
  includeUnvalidated: boolean;
  setIncludeUnvalidated: (value: boolean) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  extSearchEnabled: boolean;
  className?: string;
  showCommunityHelper?: boolean;
}

export default function DiscoverPageSearch({
  searchQuery,
  setSearchQuery,
  searchTab,
  setSearchTab,
  searchType,
  setSearchType,
  indieOnly,
  setIndieOnly,
  privacyOnly,
  setPrivacyOnly,
  noTrackers,
  setNoTrackers,
  includeUnvalidated,
  setIncludeUnvalidated,
  onSearch,
  loading,
  extSearchEnabled,
  className = '',
  showCommunityHelper = true
}: DiscoverPageSearchProps) {

  // Dynamic placeholder and context based on active tab
  const getSearchPlaceholder = () => {
    switch (searchTab) {
      case 'all':
        return '🔍 Search everything: indie sites, local content, and the web...';
      case 'indie':
        return '🌟 Search indie index sites...';
      case 'site':
        return '🏠 Search ThreadRings, users, and posts...';
      case 'web':
        return '🌍 Search the indie web...';
      default:
        return '🔍 Search...';
    }
  };

  const getSearchContext = () => {
    switch (searchTab) {
      case 'all':
        return {
          icon: '🔍',
          title: 'Unified Search',
          description: 'Search across indie sites, local content, and the web all at once'
        };
      case 'indie':
        return {
          icon: '🌐',
          title: 'Indie Index',
          description: 'Discover curated sites from our indie web collection'
        };
      case 'site':
        return {
          icon: '🏠',
          title: 'Site Content',
          description: 'Find ThreadRings, users, and posts on this site'
        };
      case 'web':
        return {
          icon: '🌍',
          title: 'Web Search',
          description: 'Search the broader indie web and small sites'
        };
      default:
        return {
          icon: '🔍',
          title: 'Search',
          description: 'Search content'
        };
    }
  };

  const context = getSearchContext();

  return (
    <div className={`bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] ${className}`}>
      {/* Integrated Tab Bar */}
      <div className="border-b border-[#A18463]/20">
        <div className="flex">
          <button
            type="button"
            onClick={() => setSearchTab('all')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
              searchTab === 'all'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span>🔍</span>
              <span>All</span>
            </span>
            {searchTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSearchTab('indie')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
              searchTab === 'indie'
                ? 'text-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span>🌐</span>
              <span>Indie Index</span>
            </span>
            {searchTab === 'indie' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSearchTab('site')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
              searchTab === 'site'
                ? 'text-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span>🏠</span>
              <span>Site</span>
            </span>
            {searchTab === 'site' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
            )}
          </button>
          {extSearchEnabled && (
            <button
              type="button"
              onClick={() => setSearchTab('web')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
                searchTab === 'web'
                  ? 'text-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span>🌍</span>
                <span>Web</span>
              </span>
              {searchTab === 'web' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Indie Index Helper - Shows on Indie Index and All tabs */}
      {showCommunityHelper && (searchTab === 'indie' || searchTab === 'all') && (
        <div className={`border-b px-3 py-2 ${
          searchTab === 'indie'
            ? 'bg-purple-50 border-purple-200/50'
            : 'bg-blue-50/50 border-blue-200/30'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <div className={`flex items-center gap-2 ${
              searchTab === 'indie' ? 'text-purple-700' : 'text-blue-700'
            }`}>
              <span className="text-base">💫</span>
              <span className="font-medium">
                {searchTab === 'indie'
                  ? 'Help build our indie index!'
                  : 'This is a community project - help us grow!'
                }
              </span>
              <button
                type="button"
                onClick={() => {
                  const info = searchTab === 'indie'
                    ? 'The Indie Index is a curated collection of indie websites, reviewed and validated by our community members. Sites are scored based on community votes, content quality, and alignment with indie web values. Anyone can submit sites for review!'
                    : 'We blend results from three sources with transparent, equitable scoring: Indie Index sites (score 50+), Local content (score 40+), and Web results (score 30+). This ensures diverse, community-driven discovery while giving priority to validated indie picks.';
                  alert(info);
                }}
                className="text-gray-500 hover:text-gray-700 ml-1"
                title="Learn more about how this works"
              >
                <span className="text-xs">ⓘ</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/community-index/submit"
                className={`hover:underline flex items-center gap-1 ${
                  searchTab === 'indie'
                    ? 'text-purple-600 hover:text-purple-800'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                title="Submit your favorite indie sites to our indie index"
              >
                <span>➕</span>
                <span className="hidden sm:inline">Submit</span>
              </Link>
              <Link
                href="/community-index/validate"
                className={`hover:underline flex items-center gap-1 ${
                  searchTab === 'indie'
                    ? 'text-purple-600 hover:text-purple-800'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                title="Help review and validate indie sites"
              >
                <span>✅</span>
                <span className="hidden sm:inline">Review</span>
              </Link>
              <Link
                href="/community-index/analytics"
                className={`hover:underline flex items-center gap-1 ${
                  searchTab === 'indie'
                    ? 'text-purple-600 hover:text-purple-800'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                title="See how our community index is growing"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Stats</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSearch} className="p-3">
        {/* Search Input Row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getSearchPlaceholder()}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Site Search Type Filter */}
          {searchTab === 'site' && (
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Content</option>
              <option value="threadrings">ThreadRings</option>
              <option value="users">Users</option>
              <option value="posts">Posts</option>
            </select>
          )}

          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-[2px_2px_0_#2563eb]"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>

          {/* Integrated Surprise Me button */}
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              try {
                const mode = searchTab === 'site' ? 'threadstead' :
                             searchTab === 'indie' ? 'curated' : 'mixed';
                const endpoint = mode === 'threadstead'
                  ? '/api/directory?limit=1&sortBy=random'
                  : `/api/extsearch/surprise?mode=${mode}`;

                const response = await fetch(endpoint);
                if (response.ok) {
                  const data = await response.json();
                  if (mode === 'threadstead' && data.users?.[0]) {
                    window.open(`/resident/${data.users[0].handle}`, '_blank');
                  } else if (data.surprise?.url) {
                    window.open(data.surprise.url, '_blank');
                  }
                }
              } catch (error) {
                console.error('Surprise failed:', error);
              }
            }}
            className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-medium transition-colors shadow-[2px_2px_0_#8b5cf6] hover:shadow-[1px_1px_0_#8b5cf6] hover:translate-x-[1px] hover:translate-y-[1px]"
            title="Surprise me with something interesting!"
          >
            <span className="flex items-center gap-1">
              <span>🎲</span>
              <span className="hidden sm:inline">Surprise</span>
            </span>
          </button>
        </div>

        {/* Web Search Filters - Compact inline */}
        {searchTab === 'web' && (
          <div className="flex flex-wrap gap-2 mt-2">
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={indieOnly}
                onChange={(e) => setIndieOnly(e.target.checked)}
                className="rounded-sm w-3 h-3"
              />
              <span>🌱 Indie</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={privacyOnly}
                onChange={(e) => setPrivacyOnly(e.target.checked)}
                className="rounded-sm w-3 h-3"
              />
              <span>🔒 Privacy</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={noTrackers}
                onChange={(e) => setNoTrackers(e.target.checked)}
                className="rounded-sm w-3 h-3"
              />
              <span>🛡️ No Trackers</span>
            </label>
          </div>
        )}

        {/* Indie Index Search Filters - For All and Indie Index tabs */}
        {showCommunityHelper && (searchTab === 'indie' || searchTab === 'all') && (
          <div className="flex flex-wrap gap-2 mt-2">
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeUnvalidated}
                onChange={(e) => setIncludeUnvalidated(e.target.checked)}
                className="rounded-sm w-3 h-3"
              />
              <span>🔄 Include unvalidated sites</span>
            </label>
          </div>
        )}
      </form>
    </div>
  );
}