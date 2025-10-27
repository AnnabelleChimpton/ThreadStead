/**
 * Admin dashboard for community index management
 */

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface SeedingStats {
  totalSeeded: number;
  pendingValidation: number;
  validatedSites: number;
  averageScore: number;
  topCategories: Array<{ category: string; count: number }>;
}

interface SeedingHealth {
  duplicatesCreated: number;
  lowQualityRatio: number;
  communityRejectionRate: number;
  crawlFailureRate: number;
  recommendations: string[];
}

interface Props {
  siteConfig: SiteConfig;
}

export default function CommunityIndexAdmin({ siteConfig }: Props) {
  const [stats, setStats] = useState<SeedingStats | null>(null);
  const [health, setHealth] = useState<SeedingHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedingReport, setSeedingReport] = useState<any>(null);

  // Seeding options
  const [seedingOptions, setSeedingOptions] = useState({
    maxQueries: 5,
    maxSitesPerQuery: 20,
    minScore: 40,
    dryRun: false
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/community-index/seeding');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSeeding = async () => {
    try {
      setSeeding(true);
      setSeedingReport(null);

      const response = await csrfFetch('/api/admin/community-index/seeding?action=run-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seedingOptions)
      });

      if (response.ok) {
        const data = await response.json();
        setSeedingReport(data.report);
        await fetchStats(); // Refresh stats
      } else {
        const error = await response.json();
        alert(error.error || 'Seeding failed');
      }
    } catch (error) {
      console.error('Seeding failed:', error);
      alert('Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const getHealthColor = (ratio: number, reverse = false) => {
    const good = reverse ? ratio > 0.5 : ratio < 0.3;
    const warning = reverse ? ratio > 0.3 && ratio <= 0.5 : ratio >= 0.3 && ratio < 0.5;

    if (good) return 'text-green-600';
    if (warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatRatio = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🌐 Community Index Dashboard</h1>
          <p className="text-gray-600">
            Monitor and manage the automated site discovery and community validation system
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{stats?.totalSeeded || 0}</div>
                <div className="text-gray-600">Total Seeded Sites</div>
              </div>
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-300 shadow-sm">
                <div className="text-3xl font-bold text-yellow-600">{stats?.pendingValidation || 0}</div>
                <div className="text-gray-600">Pending Validation</div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg border border-green-300 shadow-sm">
                <div className="text-3xl font-bold text-green-600">{stats?.validatedSites || 0}</div>
                <div className="text-gray-600">Community Approved</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-300 shadow-sm">
                <div className="text-3xl font-bold text-purple-600">
                  {stats?.averageScore ? stats.averageScore.toFixed(1) : '0'}
                </div>
                <div className="text-gray-600">Average Quality Score</div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📊 System Health</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Low Quality Ratio:</span>
                    <span className={getHealthColor(health?.lowQualityRatio || 0)}>
                      {formatRatio(health?.lowQualityRatio || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Community Rejection Rate:</span>
                    <span className={getHealthColor(health?.communityRejectionRate || 0)}>
                      {formatRatio(health?.communityRejectionRate || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crawl Failure Rate:</span>
                    <span className={getHealthColor(health?.crawlFailureRate || 0)}>
                      {formatRatio(health?.crawlFailureRate || 0)}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">🎯 Recommendations:</h3>
                  {health?.recommendations && health.recommendations.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {health.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-yellow-500">⚠️</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-green-600 text-sm">✅ System is operating normally</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📈 Top Categories</h2>
              <div className="space-y-2">
                {stats?.topCategories && stats.topCategories.length > 0 ? (
                  stats.topCategories.map((cat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="capitalize">{cat.category.replace(/_/g, ' ')}</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-sm">{cat.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No categories yet</p>
                )}
              </div>
            </div>

            {/* Seeding Controls */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🌱 Manual Seeding Controls</h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Queries</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={seedingOptions.maxQueries}
                    onChange={(e) => setSeedingOptions({ ...seedingOptions, maxQueries: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sites per Query</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={seedingOptions.maxSitesPerQuery}
                    onChange={(e) => setSeedingOptions({ ...seedingOptions, maxSitesPerQuery: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Score</label>
                  <input
                    type="number"
                    min="20"
                    max="80"
                    value={seedingOptions.minScore}
                    onChange={(e) => setSeedingOptions({ ...seedingOptions, minScore: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={seedingOptions.dryRun}
                      onChange={(e) => setSeedingOptions({ ...seedingOptions, dryRun: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Dry Run (don't add to database)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={runSeeding}
                disabled={seeding}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {seeding ? '🌱 Seeding...' : '🌱 Run Manual Seeding'}
              </button>
            </div>

            {/* Seeding Report */}
            {seedingReport && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">📋 Latest Seeding Report</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div>
                      <strong>Queries Run:</strong> {seedingReport.queriesRun.length}
                      <div className="text-sm text-gray-600 ml-4">
                        {seedingReport.queriesRun.join(', ')}
                      </div>
                    </div>
                    <div><strong>Sites Evaluated:</strong> {seedingReport.sitesEvaluated}</div>
                    <div><strong>Sites Added:</strong> {seedingReport.sitesAdded}</div>
                    <div><strong>Sites Rejected:</strong> {seedingReport.sitesRejected}</div>
                    <div><strong>Average Score:</strong> {seedingReport.averageScore?.toFixed(1) || 'N/A'}</div>
                    <div><strong>Duration:</strong> {(seedingReport.duration / 1000).toFixed(1)}s</div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">🌟 Top Finds:</h3>
                    <div className="space-y-1 text-sm">
                      {seedingReport.topFinds?.slice(0, 5).map((find: any, index: number) => (
                        <div key={index} className="truncate">
                          <span className="text-green-600">({find.seedingScore.score})</span> {find.title}
                        </div>
                      ))}
                    </div>

                    {seedingReport.errors && seedingReport.errors.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2 text-red-600">⚠️ Errors:</h3>
                        <div className="space-y-1 text-sm text-red-600">
                          {seedingReport.errors.map((error: string, index: number) => (
                            <div key={index} className="truncate">{error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-4">
              <a
                href="/community-index/validate"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                🔍 View Validation Queue
              </a>
              <a
                href="/community-index/submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                📝 Submit Site
              </a>
              <a
                href="/admin/curated-sites"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                🎲 Manage Curated Sites
              </a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  if (!user || user.role !== 'admin') {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }

  return {
    props: {
      siteConfig
    }
  };
};