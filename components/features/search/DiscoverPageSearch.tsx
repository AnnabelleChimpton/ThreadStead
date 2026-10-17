/**
 * Discover Page Search Component
 * Enhanced search for both local ThreadStead content and the wider indie web
 * Based on HomePageSearch but with additional controls for discover page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SurpriseMeButtonCompact } from './SurpriseMeButton';
import { PixelIcon } from '@/components/ui/PixelIcon';

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
        return 'Search everything: indie sites, local content, and the web...';
      case 'indie':
        return 'Search indie index sites...';
      case 'site':
        return 'Search ThreadRings, users, and posts...';
      case 'web':
        return 'Search the indie web...';
      default:
        return 'Search...';
    }
  };

  const getSearchContext = () => {
    switch (searchTab) {
      case 'all':
        return {
          icon: <PixelIcon name="search" />,
          title: 'Unified Search',
          description: 'Search across indie sites, local content, and the web all at once'
        };
      case 'indie':
        return {
          icon: <PixelIcon name="map" />,
          title: 'Indie Index',
          description: 'Discover curated sites from our indie web collection'
        };
      case 'site':
        return {
          icon: <PixelIcon name="home" />,
          title: 'Site Content',
          description: 'Find ThreadRings, users, and posts on this site'
        };
      case 'web':
        return {
          icon: <PixelIcon name="map" />,
          title: 'Web Search',
          description: 'Search the broader indie web and small sites'
        };
      default:
        return {
          icon: <PixelIcon name="search" />,
          title: 'Search',
          description: 'Search content'
        };
    }
  };

  const context = getSearchContext();

  return (
    <div className={`widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm ${className}`}>
      {/* Integrated Tab Bar */}
      <div className="border-b border-nb-ink-mid/30">
        <div className="flex overflow-x-auto scrollbar-thin" role="tablist">
          <button
            type="button"
            onClick={() => setSearchTab('all')}
            role="tab"
            aria-selected={searchTab === 'all'}
            className="ts-tab flex-1 min-w-[80px] text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="flex items-center justify-center gap-1">
              <span className="hidden sm:inline"><PixelIcon name="search" /></span>
              <span>All</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSearchTab('indie')}
            role="tab"
            aria-selected={searchTab === 'indie'}
            className="ts-tab flex-1 min-w-[80px] text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="flex items-center justify-center gap-1">
              <span className="hidden sm:inline"><PixelIcon name="map" /></span>
              <span className="hidden sm:inline">Indie Index</span>
              <span className="sm:hidden">Indie</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSearchTab('site')}
            role="tab"
            aria-selected={searchTab === 'site'}
            className="ts-tab flex-1 min-w-[80px] text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="flex items-center justify-center gap-1">
              <span className="hidden sm:inline"><PixelIcon name="home" /></span>
              <span>Site</span>
            </span>
          </button>
          {extSearchEnabled && (
            <button
              type="button"
              onClick={() => setSearchTab('web')}
              role="tab"
            aria-selected={searchTab === 'web'}
            className="ts-tab flex-1 min-w-[80px] text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="flex items-center justify-center gap-1">
                <span className="hidden sm:inline"><PixelIcon name="map" /></span>
                <span>Web</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Indie Index Helper - Shows on Indie Index and All tabs */}
      {showCommunityHelper && (searchTab === 'indie' || searchTab === 'all') && (
        <div className={`border-b px-2 sm:px-3 py-2 ${
          searchTab === 'indie'
            ? 'bg-purple-50 border-purple-200/50'
            : 'bg-blue-50/50 border-blue-200/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className={`flex items-center gap-1 sm:gap-2 ${
              searchTab === 'indie' ? 'text-purple-700' : 'text-blue-700'
            }`}>
              <span className="text-sm sm:text-base"><PixelIcon name="bookmark" /></span>
              <span className="font-medium text-[10px] sm:text-xs">
                {searchTab === 'indie'
                  ? 'Help build our indie index!'
                  : 'Community project - help us grow!'
                }
              </span>
              <button
                type="button"
                onClick={() => {
                  window.open('/discover/faq#' + (searchTab === 'indie' ? 'indie-index' : 'unified-search'), '_blank');
                }}
                className="text-gray-500 hover:text-gray-700 ml-1 touch-manipulation"
                title="Learn more about how this works"
              >
                <PixelIcon name="info-box" size={12} className="inline-block" />
              </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/community-index/submit"
                className={`hover:underline flex items-center gap-1 ${
                  searchTab === 'indie'
                    ? 'text-purple-600 hover:text-purple-800'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                title="Submit your favorite indie sites to our indie index"
              >
                <PixelIcon name="plus" />
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
                <PixelIcon name="check" />
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
                <PixelIcon name="chart" />
                <span className="hidden sm:inline">Stats</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSearch} className="p-2 sm:p-3">
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getSearchPlaceholder()}
              className="w-full px-3 py-2 text-sm sm:text-base bg-white border-2 border-nb-ink-mid/60 rounded-md focus:outline-none focus:border-nb-ink-mid"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-2">
            {/* Site Search Type Filter */}
            {searchTab === 'site' && (
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="px-2 sm:px-3 py-2 bg-white border-2 border-nb-ink-mid/60 rounded-md focus:outline-none focus:border-nb-ink-mid text-xs sm:text-sm"
              >
                <option value="all">All</option>
                <option value="threadrings">Rings</option>
                <option value="users">Users</option>
                <option value="posts">Posts</option>
              </select>
            )}

            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="thread-button btn btn--primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-1 sm:flex-none"
            >
              {loading ? '...' : 'Search'}
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
            className="thread-button-secondary btn btn--secondary text-sm sm:text-base"
            title="Surprise me with something interesting!"
          >
            <span className="flex items-center gap-1">
              <PixelIcon name="zap" />
              <span className="hidden sm:inline">Surprise</span>
            </span>
          </button>
          </div>
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
              <span><PixelIcon name="drop" className="inline-block" /> Indie</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={privacyOnly}
                onChange={(e) => setPrivacyOnly(e.target.checked)}
                className="rounded-sm w-3 h-3"
              />
              <span><PixelIcon name="shield" className="inline-block" /> Privacy</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={noTrackers}
                onChange={(e) => setNoTrackers(e.target.checked)}
                className="rounded-sm w-3 h-3"
              />
              <span><PixelIcon name="shield" className="inline-block" /> No Trackers</span>
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
              <span><PixelIcon name="reload" className="inline-block" /> Include unvalidated sites</span>
            </label>
          </div>
        )}
      </form>
    </div>
  );
}