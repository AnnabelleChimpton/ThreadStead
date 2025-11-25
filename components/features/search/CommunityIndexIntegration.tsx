/**
 * Community Index Integration Component
 * Blends community-indexed sites with external search results
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBookmarks } from '@/hooks/useBookmarks';

interface CommunityIndexSite {
  id: string;
  url: string;
  title: string;
  description?: string;
  communityScore: number;
  siteType?: string;
  tags?: string[];
}

interface CommunityIndexIntegrationProps {
  query?: string;
  limit?: number;
  onSiteClick?: (url: string, source: 'community' | 'external') => void;
  user?: { id: string } | null;
}

export default function CommunityIndexIntegration({
  query = '',
  limit = 5,
  onSiteClick,
  user
}: CommunityIndexIntegrationProps) {
  const [communitySites, setCommunitySites] = useState<CommunityIndexSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedType, setFeedType] = useState<'recent' | 'favorites'>('recent');

  // Use bookmarks hook
  const { saving, saveFromCommunityIndex } = useBookmarks();

  useEffect(() => {
    loadCommunitySites();
  }, [query, feedType]);

  const loadCommunitySites = async () => {
    setLoading(true);
    try {
      let endpoint = '';

      if (query) {
        // Search community index
        endpoint = `/api/community-index/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      } else {
        // Show discovery feed
        endpoint = `/api/community-index/feeds?type=${feedType}&limit=${limit}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        const sites = query ? data.results : (data.feed?.sites || []);
        setCommunitySites(sites);
      }
    } catch (error) {
      console.error('Failed to load community sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteClick = (url: string) => {
    // Track community discovery
    fetch('/api/community-index/track-discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromSite: window.location.origin,
        toSite: url,
        discoveryMethod: 'discovery_feed',
        metadata: { source: 'discover_page' }
      })
    }).catch(console.error);

    if (onSiteClick) {
      onSiteClick(url, 'community');
    }

    // Navigate to the URL in a new tab
    window.open(url, '_blank');
  };

  const handleSave = async (e: React.MouseEvent, site: CommunityIndexSite) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      alert('Please log in to save bookmarks');
      return;
    }

    try {
      await saveFromCommunityIndex(site);
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  };

  if (loading && communitySites.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        Loading community sites...
      </div>
    );
  }

  if (communitySites.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        {!query && (
          <div className="flex gap-2">
            <button
              onClick={() => setFeedType('recent')}
              className={`text-xs px-2 py-1 rounded ${
                feedType === 'recent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setFeedType('favorites')}
              className={`text-xs px-2 py-1 rounded ${
                feedType === 'favorites'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Favorites
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {communitySites.map((site) => (
          <div
            key={site.id}
            className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {/* Main clickable content */}
            <div className="cursor-pointer" onClick={() => handleSiteClick(site.url)}>
              <h4 className="font-medium text-blue-900 hover:text-blue-700 line-clamp-2">
                {site.title}
              </h4>
              {site.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {site.description}
                </p>
              )}
            </div>

            {/* Bottom section with metadata and actions */}
            <div className="flex items-center justify-between pt-2 border-t border-blue-200/50 mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-1">
                {site.communityScore > 0 && (
                  <span>Score: {site.communityScore}</span>
                )}
                {site.siteType && (
                  <>
                    {site.communityScore > 0 && <span>•</span>}
                    <span>{site.siteType.replace('_', ' ')}</span>
                  </>
                )}
                {site.tags && site.tags.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{site.tags.slice(0, 2).join(', ')}</span>
                  </>
                )}
              </div>

              {/* Compact action buttons at bottom */}
              <div className="flex gap-1.5 ml-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Community
                </span>
                {user && (
                  <button
                    onClick={(e) => handleSave(e, site)}
                    disabled={saving}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
                    title="Save to bookmarks"
                  >
                    {saving ? (
                      <div className="w-4 h-4 animate-spin border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}