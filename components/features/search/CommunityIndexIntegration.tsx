/**
 * Community Index Integration Component
 * Blends community-indexed sites with external search results
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
}

export default function CommunityIndexIntegration({
  query = '',
  limit = 5,
  onSiteClick
}: CommunityIndexIntegrationProps) {
  const [communitySites, setCommunitySites] = useState<CommunityIndexSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedType, setFeedType] = useState<'recent' | 'favorites'>('recent');

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
        <h3 className="text-sm font-semibold text-gray-700">
          🌟 From Community Index
        </h3>
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
            className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            onClick={() => handleSiteClick(site.url)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 hover:text-blue-700">
                  {site.title}
                </h4>
                {site.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {site.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {site.communityScore > 0 && (
                    <span>Score: {site.communityScore}</span>
                  )}
                  {site.siteType && (
                    <span>{site.siteType.replace('_', ' ')}</span>
                  )}
                  {site.tags && site.tags.length > 0 && (
                    <span>{site.tags.slice(0, 3).join(', ')}</span>
                  )}
                </div>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Community
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Subtle contribution prompt */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Help grow the indie web index
          </p>
          <div className="flex gap-2">
            <Link
              href="/community-index/submit"
              className="text-xs text-blue-600 hover:underline"
            >
              Submit a site
            </Link>
            <span className="text-xs text-gray-400">•</span>
            <Link
              href="/community-index/validate"
              className="text-xs text-blue-600 hover:underline"
            >
              Review sites
            </Link>
            <span className="text-xs text-gray-400">•</span>
            <Link
              href="/community-index/discover"
              className="text-xs text-blue-600 hover:underline"
            >
              Explore more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}