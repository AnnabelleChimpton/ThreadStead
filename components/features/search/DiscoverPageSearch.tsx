/**
 * Discover Page Search Component
 * Enhanced search for both local ThreadStead content and the wider indie web
 * Based on HomePageSearch but with additional controls for discover page
 */

import { useState, useEffect } from 'react';

interface DiscoverPageSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchTab: 'local' | 'smallweb';
  setSearchTab: (tab: 'local' | 'smallweb') => void;
  searchType: 'all' | 'threadrings' | 'users' | 'posts';
  setSearchType: (type: 'all' | 'threadrings' | 'users' | 'posts') => void;
  indieOnly: boolean;
  setIndieOnly: (value: boolean) => void;
  privacyOnly: boolean;
  setPrivacyOnly: (value: boolean) => void;
  noTrackers: boolean;
  setNoTrackers: (value: boolean) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  extSearchEnabled: boolean;
  className?: string;
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
  onSearch,
  loading,
  extSearchEnabled,
  className = ''
}: DiscoverPageSearchProps) {

  return (
    <div className={`bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 ${className}`}>
      <form onSubmit={onSearch} className="space-y-3">

        {/* Search Mode Toggle */}
        {extSearchEnabled && (
          <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 mb-3">
            <button
              type="button"
              onClick={() => setSearchTab('local')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                searchTab === 'local'
                  ? 'bg-blue-500 text-white shadow-md transform scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🏠</span>
                <span>ThreadStead</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSearchTab('smallweb')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                searchTab === 'smallweb'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🌍</span>
                <span>WorldWideWeb</span>
              </div>
            </button>
          </div>
        )}

        {/* Search Input Row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchTab === 'smallweb' ? '🌍 Search the indie web...' : '🔍 Search ThreadRings, users, posts...'}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Local Search Type Filter */}
          {searchTab === 'local' && (
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
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
        </div>

        {/* Small Web Filters */}
        {searchTab === 'smallweb' && (
          <div className="flex flex-wrap gap-3 text-sm pt-2 border-t border-gray-200">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={indieOnly}
                onChange={(e) => setIndieOnly(e.target.checked)}
                className="rounded"
              />
              <span>🌱 Indie Web Only</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyOnly}
                onChange={(e) => setPrivacyOnly(e.target.checked)}
                className="rounded"
              />
              <span>🔒 Privacy-First</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noTrackers}
                onChange={(e) => setNoTrackers(e.target.checked)}
                className="rounded"
              />
              <span>🛡️ No Trackers</span>
            </label>
          </div>
        )}
      </form>

      {/* Search Description - Compact */}
      <div className="text-xs mt-2 text-center">
        {searchTab === 'smallweb' && extSearchEnabled ? (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded px-3 py-1">
            <span className="text-purple-700 font-medium">🌍 Searching the WorldWideWeb</span>
            <span className="text-gray-500 mx-2">•</span>
            <span className="text-gray-600">Discover indie sites & small web content</span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1">
            <span className="text-blue-700 font-medium">🏠 Searching ThreadStead</span>
            <span className="text-gray-500 mx-2">•</span>
            <span className="text-gray-600">Find community content & ThreadRings</span>
          </div>
        )}
      </div>
    </div>
  );
}