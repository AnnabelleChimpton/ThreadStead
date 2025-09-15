import React, { useState, useEffect } from 'react';

interface ShareAnalytics {
  totalShares: number;
  sharesByMethod: {
    copy_link: number;
    copy_code: number;
    social_share: number;
  };
  topSharers: Array<{
    userId: string;
    displayName: string;
    handle: string;
    shareCount: number;
  }>;
  recentShares: Array<{
    id: string;
    shareMethod: string;
    sharedAt: string;
    platform?: string;
    sharer: {
      displayName: string;
      handle: string;
    };
    code: {
      code: string;
    };
  }>;
  sharesOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export default function BetaInviteAnalyticsSection() {
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/beta-invite-analytics');

      if (!response.ok) {
        throw new Error('Failed to fetch invite analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getShareMethodIcon = (method: string) => {
    switch (method) {
      case 'copy_link': return '🔗';
      case 'copy_code': return '🔑';
      case 'social_share': return '📱';
      default: return '📋';
    }
  };

  const getShareMethodLabel = (method: string) => {
    switch (method) {
      case 'copy_link': return 'Copy Link';
      case 'copy_code': return 'Copy Code';
      case 'social_share': return 'Social Share';
      default: return method;
    }
  };

  if (loading) {
    return (
      <div className="border border-gray-300 rounded p-4 bg-gray-50">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          📊 Beta Invite Sharing Analytics
        </h3>
        <div className="text-center py-8 text-gray-500">
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-300 rounded p-4 bg-gray-50">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          📊 Beta Invite Sharing Analytics
        </h3>
        <div className="text-center py-8 text-red-600">
          Error: {error}
          <button
            onClick={loadAnalytics}
            className="block mx-auto mt-2 px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          📊 Beta Invite Sharing Analytics
        </h3>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="border border-black px-3 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
            <div className="text-2xl font-bold text-blue-800">{analytics.totalShares}</div>
            <div className="text-sm text-blue-600">Total Shares</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
            <div className="text-2xl font-bold text-green-800">{analytics.sharesByMethod.copy_link}</div>
            <div className="text-sm text-green-600">🔗 Link Shares</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
            <div className="text-2xl font-bold text-yellow-800">{analytics.sharesByMethod.copy_code}</div>
            <div className="text-sm text-yellow-600">🔑 Code Shares</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-4 text-center">
            <div className="text-2xl font-bold text-purple-800">{analytics.sharesByMethod.social_share}</div>
            <div className="text-sm text-purple-600">📱 Social Shares</div>
          </div>
        </div>

        {/* Share Methods Breakdown */}
        <div className="bg-white border border-black rounded p-4">
          <h4 className="font-bold mb-3">📈 Share Method Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(analytics.sharesByMethod).map(([method, count]) => {
              const percentage = analytics.totalShares > 0 ? (count / analytics.totalShares * 100).toFixed(1) : '0';
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getShareMethodIcon(method)}</span>
                    <span className="text-sm">{getShareMethodLabel(method)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                    <span className="text-xs text-gray-500 w-10 text-right">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Sharers */}
        {analytics.topSharers.length > 0 && (
          <div className="bg-white border border-black rounded p-4">
            <h4 className="font-bold mb-3">🏆 Top Sharers</h4>
            <div className="space-y-2">
              {analytics.topSharers.map((sharer, index) => (
                <div key={sharer.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                    </span>
                    <div>
                      <div className="font-medium">{sharer.displayName}</div>
                      <div className="text-xs text-gray-500">{sharer.handle}</div>
                    </div>
                  </div>
                  <div className="font-bold text-blue-600">{sharer.shareCount} shares</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {analytics.recentShares.length > 0 && (
          <div className="bg-white border border-black rounded p-4">
            <h4 className="font-bold mb-3">⏰ Recent Sharing Activity</h4>
            <div className="space-y-2">
              {analytics.recentShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span>{getShareMethodIcon(share.shareMethod)}</span>
                    <div>
                      <span className="font-medium">{share.sharer.displayName}</span>
                      <span className="text-gray-500"> shared code </span>
                      <code className="bg-gray-200 px-1 rounded text-xs">{share.code.code}</code>
                      {share.platform && (
                        <span className="text-gray-500"> on {share.platform}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(share.sharedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shares Over Time Chart */}
        {analytics.sharesOverTime.length > 0 && (
          <div className="bg-white border border-black rounded p-4">
            <h4 className="font-bold mb-3">📅 Shares Over Time (Last 7 Days)</h4>
            <div className="space-y-1">
              {analytics.sharesOverTime.map((dayData) => {
                const maxCount = Math.max(...analytics.sharesOverTime.map(d => d.count));
                const percentage = maxCount > 0 ? (dayData.count / maxCount * 100) : 0;

                return (
                  <div key={dayData.date} className="flex items-center gap-3">
                    <div className="text-xs w-16 text-gray-600">
                      {new Date(dayData.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                      <div
                        className="bg-blue-500 h-4 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {dayData.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {analytics.totalShares === 0 && (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-4 block">📊</span>
            <p>No invite sharing activity yet.</p>
            <p className="text-sm mt-2">Analytics will appear here once users start sharing their beta invite codes.</p>
          </div>
        )}
      </div>
    </div>
  );
}