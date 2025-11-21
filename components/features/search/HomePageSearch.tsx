/**
 * Home Page Search Component
 * Enhanced search for both local ThreadStead content and the wider indie web
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useExtSearchStatus } from '@/hooks/useExtSearch';
import { SurpriseMeButtonCompact } from './SurpriseMeButton';
import { PixelIcon } from '@/components/ui/PixelIcon';

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
      router.push(`/discover/search?${searchParams}`);
    } else {
      // Navigate to discover page with local search
      const searchParams = new URLSearchParams({
        q: searchQuery,
        tab: 'local'
      });
      router.push(`/discover/search?${searchParams}`);
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
              placeholder={searchMode === 'web' ? 'Search the indie web...' : 'Search ThreadRings, users, posts...'}
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
          <SurpriseMeButtonCompact
            mode={searchMode === 'web' ? 'curated' : 'threadstead'}
          />
        </div>

        {/* Search Mode Toggle */}
        {hasExternalEngines && (
          <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchMode('local')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                searchMode === 'local'
                  ? 'bg-blue-500 text-white shadow-md transform scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <PixelIcon name="home" />
                <span>ThreadStead</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('web')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                searchMode === 'web'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <PixelIcon name="map" />
                <span>WorldWideWeb</span>
              </div>
            </button>
          </div>
        )}
      </form>

      {/* Search Description - Compact */}
      <div className="text-xs mt-2 text-center">
        {searchMode === 'web' && hasExternalEngines ? (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded px-3 py-1">
            <span className="text-purple-700 font-medium"><PixelIcon name="map" className="inline-block align-middle" /> Searching the WorldWideWeb</span>
            <span className="text-gray-500 mx-2">•</span>
            <span className="text-gray-600">Discover indie sites & small web content</span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1">
            <span className="text-blue-700 font-medium"><PixelIcon name="home" className="inline-block align-middle" /> Searching ThreadStead</span>
            <span className="text-gray-500 mx-2">•</span>
            <span className="text-gray-600">Find community content & ThreadRings</span>
          </div>
        )}
      </div>

    </div>
  );
}