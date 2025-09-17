/**
 * Community Analytics Dashboard
 * Shows insights into discovery patterns, site relationships, and community activity
 */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { AnalyticsMetrics, TimeSeriesData } from '@/lib/community-index/analytics/community-analytics';
import Layout from '@/components/ui/layout/Layout';

interface AnalyticsPageProps {
  user: any;
  initialMetrics: AnalyticsMetrics;
}

export default function AnalyticsPage({ user, initialMetrics }: AnalyticsPageProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>(initialMetrics);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<30 | 90 | 365>(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [metricsResponse, timeSeriesResponse] = await Promise.all([
        fetch(`/api/community-index/analytics?type=overview&days=${selectedPeriod}`),
        fetch(`/api/community-index/analytics?type=timeseries&days=${selectedPeriod}&granularity=day`)
      ]);

      if (metricsResponse.ok) {
        const data = await metricsResponse.json();
        setMetrics(data.metrics);
      }

      if (timeSeriesResponse.ok) {
        const data = await timeSeriesResponse.json();
        setTimeSeriesData(data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Community Analytics</h1>
          <p className="text-gray-600 max-w-2xl">
            Insights into discovery patterns, site relationships, and community activity
            in ThreadStead&apos;s community index.
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-8">
          <div className="flex gap-2">
            {[30, 90, 365].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days as 30 | 90 | 365)}
                className={`px-4 py-2 rounded text-sm ${
                  selectedPeriod === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days === 365 ? '1 Year' : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading analytics...</p>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Sites"
            value={formatNumber(metrics.overview.totalSites)}
            subtitle={`${formatNumber(metrics.overview.validatedSites)} validated`}
            trend="neutral"
          />
          <MetricCard
            title="Discoveries"
            value={formatNumber(metrics.overview.totalDiscoveries)}
            subtitle={`Last ${selectedPeriod} days`}
            trend="up"
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(metrics.overview.activeUsers)}
            subtitle={`Last ${selectedPeriod} days`}
            trend="up"
          />
          <MetricCard
            title="Avg Community Score"
            value={metrics.overview.averageCommunityScore.toFixed(1)}
            subtitle="For validated sites"
            trend="neutral"
          />
          <MetricCard
            title="Pending Validation"
            value={formatNumber(metrics.overview.pendingSites)}
            subtitle="Sites awaiting review"
            trend={metrics.overview.pendingSites > 50 ? "down" : "neutral"}
          />
          <MetricCard
            title="Site Health"
            value={formatPercentage((metrics.siteHealth.highQuality / metrics.overview.totalSites) * 100)}
            subtitle="High quality sites"
            trend="up"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Discovery Trends Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Discovery Trends</h3>
            <SimpleLineChart
              data={metrics.discoveryTrends}
              xKey="date"
              lines={[
                { key: 'discoveries', label: 'Discoveries', color: '#3B82F6' },
                { key: 'validations', label: 'Validations', color: '#10B981' },
                { key: 'newSites', label: 'New Sites', color: '#F59E0B' }
              ]}
            />
          </div>

          {/* Discovery Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Discovery Methods</h3>
            <div className="space-y-3">
              {metrics.discoveryMethods.slice(0, 8).map((method) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium capitalize">
                      {method.method.replace('_', ' ')}
                    </span>
                    <TrendIcon trend={method.trend} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {formatNumber(method.count)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({formatPercentage(method.percentage)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Categories */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
            <div className="space-y-3">
              {metrics.topCategories.slice(0, 8).map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {category.category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {formatNumber(category.count)} sites
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Avg: {category.averageScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site Relationships */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Site Relationships</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Strong Connections</span>
                <span className="font-medium">{formatNumber(metrics.relationshipInsights.strongConnections)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Connections</span>
                <span className="font-medium">{metrics.relationshipInsights.averageConnections.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Isolated Sites</span>
                <span className="font-medium">{formatNumber(metrics.relationshipInsights.isolatedSites)}</span>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Connectors</h4>
                <div className="space-y-2">
                  {metrics.relationshipInsights.topConnectors.slice(0, 3).map((connector) => (
                    <div key={connector.url} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{connector.title}</span>
                      <span className="text-gray-500 ml-2">{connector.connections}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Top Contributors</h3>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Top Validators</h4>
              <div className="space-y-2">
                {metrics.userActivity.topValidators.slice(0, 5).map((validator) => (
                  <div key={validator.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">@{validator.handle}</span>
                      <QualityBadge quality={validator.quality} />
                    </div>
                    <span className="text-sm text-gray-600">
                      {formatNumber(validator.validations)} votes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Top Discoverers</h4>
              <div className="space-y-2">
                {metrics.userActivity.topDiscoverers.slice(0, 5).map((discoverer) => (
                  <div key={discoverer.userId} className="flex items-center justify-between">
                    <span className="text-sm font-medium">@{discoverer.handle}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {formatNumber(discoverer.discoveries)}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {formatPercentage(discoverer.successRate)} success
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Site Health */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Site Health Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">High Quality Sites</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatNumber(metrics.siteHealth.highQuality)}</span>
                  <span className="text-xs text-green-600">
                    ({formatPercentage((metrics.siteHealth.highQuality / metrics.overview.totalSites) * 100)})
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Need Improvement</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatNumber(metrics.siteHealth.needsImprovement)}</span>
                  <span className="text-xs text-yellow-600">
                    ({formatPercentage((metrics.siteHealth.needsImprovement / metrics.overview.totalSites) * 100)})
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Problematic Sites</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatNumber(metrics.siteHealth.problematic)}</span>
                  <span className="text-xs text-red-600">
                    ({formatPercentage((metrics.siteHealth.problematic / metrics.overview.totalSites) * 100)})
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-gray-600">Avg Validation Time</span>
                <span className="font-medium">{metrics.siteHealth.averageValidationTime.toFixed(1)}h</span>
              </div>
            </div>

            {/* Health Score Visual */}
            <div className="mt-4">
              <div className="flex rounded-full overflow-hidden h-3">
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(metrics.siteHealth.highQuality / metrics.overview.totalSites) * 100}%`
                  }}
                ></div>
                <div
                  className="bg-yellow-500"
                  style={{
                    width: `${(metrics.siteHealth.needsImprovement / metrics.overview.totalSites) * 100}%`
                  }}
                ></div>
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(metrics.siteHealth.problematic / metrics.overview.totalSites) * 100}%`
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>High Quality</span>
                <span>Needs Work</span>
                <span>Problematic</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Helper Components

function MetricCard({
  title,
  value,
  subtitle,
  trend
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <TrendIcon trend={trend} />
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'neutral') return null;

  return (
    <svg
      className={`w-4 h-4 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      {trend === 'up' ? (
        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      )}
    </svg>
  );
}

function QualityBadge({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700'
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${colors[quality]}`}>
      {quality}
    </span>
  );
}

function SimpleLineChart({
  data,
  xKey,
  lines
}: {
  data: any[];
  xKey: string;
  lines: { key: string; label: string; color: string }[];
}) {
  if (data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  // Simple visualization - in production, use a proper charting library
  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <div key={line.key}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: line.color }}
            ></div>
            <span className="text-sm font-medium">{line.label}</span>
          </div>
          <div className="text-sm text-gray-600">
            Latest: {data[data.length - 1]?.[line.key] || 0}
          </div>
        </div>
      ))}
      <div className="text-xs text-gray-500 mt-4">
        Data from {data[0]?.[xKey]} to {data[data.length - 1]?.[xKey]}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const user = await getSessionUser(context.req as any);

    // Load initial analytics
    const { CommunityAnalytics } = await import('@/lib/community-index/analytics/community-analytics');
    const analytics = new CommunityAnalytics();
    const initialMetrics = await analytics.getMetrics(30);

    return {
      props: {
        user: user ? {
          id: user.id,
          primaryHandle: user.primaryHandle,
          createdAt: user.createdAt.toISOString()
        } : null,
        initialMetrics: JSON.parse(JSON.stringify(initialMetrics))
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        user: null,
        initialMetrics: {
          overview: {
            totalSites: 0,
            validatedSites: 0,
            pendingSites: 0,
            totalDiscoveries: 0,
            activeUsers: 0,
            averageCommunityScore: 0
          },
          discoveryTrends: [],
          discoveryMethods: [],
          topCategories: [],
          userActivity: { topValidators: [], topDiscoverers: [] },
          siteHealth: {
            highQuality: 0,
            needsImprovement: 0,
            problematic: 0,
            averageValidationTime: 0
          },
          relationshipInsights: {
            strongConnections: 0,
            isolatedSites: 0,
            averageConnections: 0,
            topConnectors: []
          }
        }
      }
    };
  }
};