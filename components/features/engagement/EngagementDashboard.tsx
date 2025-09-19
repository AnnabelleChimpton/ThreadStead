/**
 * Engagement Metrics Dashboard
 * Displays community engagement analytics based on actual usage patterns
 */

import React, { useState, useEffect } from 'react';

interface EngagementMetric {
  id: string;
  url: string;
  title: string;
  description?: string;
  siteType?: string;
  discoveryMethod: string;
  communityScore: number;
  engagementMetrics: {
    totalScore: number;
    breakdown: {
      bookmarks: number;
      totalVisits: number;
      recentVisits: number;
      uniqueUsers: number;
      retentionRate: number;
      discoveryMethod: string;
    };
    scoring: {
      bookmarkScore: number;
      visitScore: number;
      recentActivityScore: number;
      uniqueUserScore: number;
      retentionBonus: number;
      discoveryMethodBonus: number;
    };
  };
}

interface EngagementDashboardProps {
  className?: string;
}

export default function EngagementDashboard({ className = '' }: EngagementDashboardProps) {
  const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    loadEngagementMetrics();
  }, [period, limit]);

  const loadEngagementMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/community-index/engagement?period=${period}&limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.metrics);
      } else {
        setError('Failed to load engagement metrics');
      }
    } catch (err) {
      setError('Network error loading metrics');
      console.error('Failed to load engagement metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDiscoveryMethodIcon = (method: string): string => {
    switch (method) {
      case 'user_bookmark': return '👤';
      case 'manual_submit': return '📝';
      case 'api_seeding': return '🤖';
      default: return '🔍';
    }
  };

  const getDiscoveryMethodLabel = (method: string): string => {
    switch (method) {
      case 'user_bookmark': return 'User Save';
      case 'manual_submit': return 'Manual Submit';
      case 'api_seeding': return 'Crawler';
      default: return 'Unknown';
    }
  };

  const getSiteTypeIcon = (type?: string): string => {
    switch (type) {
      case 'blog': return '📝';
      case 'personal': return '👤';
      case 'portfolio': return '🎨';
      case 'documentation': return '📚';
      case 'tool': return '🔧';
      case 'resource': return '📦';
      default: return '🌐';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded-lg h-8 w-64 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 mb-3"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <h3 className="text-red-900 font-medium">Error Loading Metrics</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={loadEngagementMetrics}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try again →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Community Engagement</h2>
          <p className="text-sm text-gray-600 mt-1">
            Sites ranked by actual user engagement, not votes
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      {/* Metrics */}
      {metrics.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl mb-3 block">📊</span>
          <h3 className="text-gray-900 font-medium mb-1">No engagement data yet</h3>
          <p className="text-gray-600 text-sm">
            Engagement metrics will appear as users bookmark and visit sites
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {metrics.map((site, index) => (
            <div
              key={site.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Site info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <span className="text-lg">{getSiteTypeIcon(site.siteType)}</span>
                    <h3 className="font-medium text-gray-900 truncate">
                      {site.title}
                    </h3>
                  </div>

                  {site.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {site.description}
                    </p>
                  )}

                  <div className="text-xs text-green-600 mb-2 truncate">
                    {site.url}
                  </div>

                  {/* Engagement breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-blue-50 rounded px-2 py-1">
                      <div className="font-medium text-blue-900">
                        {site.engagementMetrics.breakdown.bookmarks}
                      </div>
                      <div className="text-blue-700">bookmarks</div>
                    </div>
                    <div className="bg-green-50 rounded px-2 py-1">
                      <div className="font-medium text-green-900">
                        {site.engagementMetrics.breakdown.totalVisits}
                      </div>
                      <div className="text-green-700">total visits</div>
                    </div>
                    <div className="bg-purple-50 rounded px-2 py-1">
                      <div className="font-medium text-purple-900">
                        {site.engagementMetrics.breakdown.uniqueUsers}
                      </div>
                      <div className="text-purple-700">unique users</div>
                    </div>
                    <div className="bg-orange-50 rounded px-2 py-1">
                      <div className="font-medium text-orange-900">
                        {site.engagementMetrics.breakdown.retentionRate}%
                      </div>
                      <div className="text-orange-700">retention</div>
                    </div>
                  </div>
                </div>

                {/* Score and discovery method */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {site.engagementMetrics.totalScore}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    engagement score
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>{getDiscoveryMethodIcon(site.discoveryMethod)}</span>
                    <span className="text-gray-600">
                      {getDiscoveryMethodLabel(site.discoveryMethod)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Methodology note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
        <h4 className="font-medium text-gray-900 mb-2">📊 How Engagement is Calculated</h4>
        <div className="text-gray-600 space-y-1">
          <div>• <strong>Bookmarks:</strong> 10 points each (shows intent to return)</div>
          <div>• <strong>Visits:</strong> 2 points each (shows actual usage)</div>
          <div>• <strong>Recent activity:</strong> 5 points per recent visit (shows current relevance)</div>
          <div>• <strong>Unique users:</strong> 15 points each (shows broad appeal)</div>
          <div>• <strong>Retention:</strong> 0.5 points per % (users who actually visit after bookmarking)</div>
          <div>• <strong>Discovery bonus:</strong> Human submissions get higher priority than crawler</div>
        </div>
      </div>
    </div>
  );
}