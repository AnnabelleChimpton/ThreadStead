/**
 * "Sites like this" recommendation component
 * Shows related sites based on discovery patterns and relationships
 */

import { useState, useEffect } from 'react';

interface SimilarSite {
  url: string;
  title?: string;
  similarity: number;
  reasons: string[];
}

interface RelatedSite {
  url: string;
  title?: string;
  relationshipType: string;
  strength: number;
  sharedUsers: number;
  discoveryMethods: string[];
  recentActivity: number;
}

interface SiteLikeThisProps {
  siteUrl: string;
  showTitle?: boolean;
  limit?: number;
  className?: string;
}

export function SiteLikeThis({
  siteUrl,
  showTitle = true,
  limit = 8,
  className = ''
}: SiteLikeThisProps) {
  const [similarSites, setSimilarSites] = useState<SimilarSite[]>([]);
  const [relatedSites, setRelatedSites] = useState<RelatedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'similar' | 'related'>('similar');

  useEffect(() => {
    loadRecommendations();
  }, [siteUrl, limit]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load both similar sites and related sites
      const [similarResponse, relatedResponse] = await Promise.all([
        fetch(`/api/community-index/relationships?action=similar&site=${encodeURIComponent(siteUrl)}&limit=${limit}`),
        fetch(`/api/community-index/relationships?action=insights&site=${encodeURIComponent(siteUrl)}&limit=${limit}`)
      ]);

      if (similarResponse.ok) {
        const similarData = await similarResponse.json();
        setSimilarSites(similarData.similarSites || []);
      }

      if (relatedResponse.ok) {
        const relatedData = await relatedResponse.json();
        setRelatedSites(relatedData.insights?.relatedSites || []);
      }

    } catch (err) {
      setError('Failed to load recommendations');
      console.error('Error loading site recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteClick = async (targetUrl: string, recommendationType: string) => {
    try {
      // Track the recommendation click
      await fetch('/api/community-index/track-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromSite: siteUrl,
          toSite: targetUrl,
          discoveryMethod: 'recommendation',
          metadata: {
            recommendationType,
            sourceComponent: 'SiteLikeThis',
            originalSite: siteUrl
          }
        })
      });
    } catch (error) {
      console.warn('Failed to track recommendation click:', error);
    }

    // Open in new tab
    window.open(targetUrl, '_blank');
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3">Sites like this</h3>}
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3">Sites like this</h3>}
        <div className="text-sm text-gray-500 text-center py-4">
          {error}
        </div>
      </div>
    );
  }

  const hasRecommendations = similarSites.length > 0 || relatedSites.length > 0;

  if (!hasRecommendations) {
    return (
      <div className={`${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3">Sites like this</h3>}
        <div className="text-sm text-gray-500 text-center py-4">
          No similar sites found yet. This site may be unique or newly discovered!
        </div>
      </div>
    );
  }

  const currentSites = viewMode === 'similar' ? similarSites : relatedSites;

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Sites like this</h3>

          {similarSites.length > 0 && relatedSites.length > 0 && (
            <div className="flex text-xs border rounded">
              <button
                onClick={() => setViewMode('similar')}
                className={`px-2 py-1 ${
                  viewMode === 'similar'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Similar ({similarSites.length})
              </button>
              <button
                onClick={() => setViewMode('related')}
                className={`px-2 py-1 ${
                  viewMode === 'related'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Related ({relatedSites.length})
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {currentSites.slice(0, limit).map((site, index) => (
          <div
            key={`${viewMode}-${site.url}-${index}`}
            className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleSiteClick(site.url, viewMode)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight truncate">
                  {site.title || new URL(site.url).hostname}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {new URL(site.url).hostname}
                </p>

                {viewMode === 'similar' && 'similarity' in site && (
                  <div className="mt-1">
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="mr-2">Match: {Math.round(site.similarity)}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${Math.min(site.similarity, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    {site.reasons && site.reasons.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {site.reasons.slice(0, 2).join(', ')}
                        {site.reasons.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'related' && 'strength' in site && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="capitalize">
                        {site.relationshipType.replace('_', ' ')}
                      </span>
                      <span>Strength: {site.strength}</span>
                    </div>
                    {site.discoveryMethods && site.discoveryMethods.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        via {site.discoveryMethods.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="ml-2 flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentSites.length > limit && (
        <div className="text-center mt-3">
          <button
            onClick={() => {
              // Could implement "load more" or redirect to full results
              window.open(`/community-index/discover?similar=${encodeURIComponent(siteUrl)}`, '_blank');
            }}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            View all {currentSites.length} recommendations →
          </button>
        </div>
      )}
    </div>
  );
}

export default SiteLikeThis;