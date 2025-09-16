/**
 * Home Page Search Component
 * Enhanced search for both local ThreadStead content and the wider indie web
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useExtSearchStatus } from '@/hooks/useExtSearch';

interface HomePageSearchProps {
  className?: string;
}

export default function HomePageSearch({ className }: HomePageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'local' | 'web'>('local');
  const router = useRouter();

  // Check if external search is available
  const { engines } = useExtSearchStatus();
  const hasExternalEngines = engines.length > 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchMode === 'web' && hasExternalEngines) {
      // Navigate to discover page with Small Web search
      const searchParams = new URLSearchParams({
        q: searchQuery,
        tab: 'smallweb'
      });
      router.push(`/discover?${searchParams}`);
    } else {
      // Navigate to discover page with local search
      const searchParams = new URLSearchParams({
        q: searchQuery,
        tab: 'local'
      });
      router.push(`/discover?${searchParams}`);
    }
  };

  const toggleSearchMode = () => {
    if (!hasExternalEngines) return; // Don't toggle if external search isn't available
    setSearchMode(searchMode === 'local' ? 'web' : 'local');
  };

  return (
    <div className={`bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 ${className}`}>
      <form onSubmit={handleSearch} className="space-y-2">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchMode === 'web' ? '🌍 Search the indie web...' : '🔍 Search ThreadRings, users, posts...'}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-[2px_2px_0_#2563eb]"
          >
            Search
          </button>
        </div>

        {/* Search Mode Toggle */}
        {hasExternalEngines && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSearchMode('local')}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                searchMode === 'local'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🏠 ThreadStead
            </button>
            <span className="text-gray-400 text-sm">or</span>
            <button
              type="button"
              onClick={() => setSearchMode('web')}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                searchMode === 'web'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🌍 WorldWideWeb
            </button>
          </div>
        )}
      </form>

      {/* Search Description */}
      <div className="text-xs text-gray-500 mt-2 text-center">
        {searchMode === 'web' && hasExternalEngines ? (
          <>
            <strong>Search content on ThreadStead or the WorldWideWeb itself!</strong>
            <br />
            Discover indie blogs, personal sites, and privacy-focused content across the small web
          </>
        ) : (
          <>
            Find anything in your community • Discover new ThreadRings • Connect with neighbors
          </>
        )}
      </div>

      {/* Engine Status Indicator */}
      {hasExternalEngines && searchMode === 'web' && (
        <div className="text-xs text-gray-400 mt-1 text-center">
          Powered by {engines.filter(e => e.available).length} indie search engines
        </div>
      )}
    </div>
  );
}