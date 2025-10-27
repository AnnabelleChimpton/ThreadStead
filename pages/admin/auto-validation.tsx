/**
 * Admin dashboard for monitoring auto-validation system
 */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface AutoValidationStats {
  pending: {
    total: number;
    highScore: number;
    mediumScore: number;
    lowScore: number;
  };
  processed: {
    approved: number;
    rejected: number;
    total: number;
  };
  recent: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

interface RecentAutoValidation {
  id: string;
  url: string;
  title: string;
  autoValidated: boolean;
  autoValidationScore: number;
  autoValidatedAt: string;
  seedingScore: number;
}

interface Props {
  siteConfig: SiteConfig;
  user: any;
}

export default function AutoValidationDashboard({ siteConfig, user }: Props) {
  const [stats, setStats] = useState<AutoValidationStats | null>(null);
  const [recentValidations, setRecentValidations] = useState<RecentAutoValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, recentResponse] = await Promise.all([
        fetch('/api/admin/auto-validation/stats'),
        fetch('/api/admin/auto-validation/recent')
      ]);

      if (statsResponse.ok && recentResponse.ok) {
        const [statsData, recentData] = await Promise.all([
          statsResponse.json(),
          recentResponse.json()
        ]);

        setStats(statsData.stats);
        setRecentValidations(recentData.validations);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAutoValidation = async (force = false) => {
    setRunning(true);
    try {
      const response = await csrfFetch('/api/community-index/auto-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Auto-validation completed!\nApproved: ${result.results.approved}\nRejected: ${result.results.rejected}\nSkipped: ${result.results.skipped}`);
        await loadDashboardData(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to run auto-validation: ${error}`);
    } finally {
      setRunning(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>This page requires admin access.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🤖 Auto-Validation Dashboard</h1>
          <p className="text-gray-600">
            Monitor and control the automatic validation system for crawler-discovered sites
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={() => runAutoValidation(false)}
              disabled={running}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Run Auto-Validation'}
            </button>
            <button
              onClick={() => runAutoValidation(true)}
              disabled={running}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Force Run (Lower Thresholds)'}
            </button>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Pending Sites */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">⏳ Pending Validation</h3>
              <div className="text-3xl font-bold text-orange-600 mb-2">{stats.pending.total}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>High Score (75+)</span>
                  <span className="font-medium text-green-600">{stats.pending.highScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium Score (30-75)</span>
                  <span className="font-medium text-yellow-600">{stats.pending.mediumScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Low Score (&lt;30)</span>
                  <span className="font-medium text-red-600">{stats.pending.lowScore}</span>
                </div>
              </div>
            </div>

            {/* Processed Sites */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-700">✅ Auto-Processed</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.processed.total}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Approved</span>
                  <span className="font-medium text-green-600">{stats.processed.approved}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rejected</span>
                  <span className="font-medium text-red-600">{stats.processed.rejected}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-medium">
                    {stats.processed.total > 0
                      ? Math.round((stats.processed.approved / stats.processed.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-700">📊 Recent Activity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Last 24 hours</span>
                  <span className="font-medium">{stats.recent.last24h}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last 7 days</span>
                  <span className="font-medium">{stats.recent.last7d}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last 30 days</span>
                  <span className="font-medium">{stats.recent.last30d}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Validations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Auto-Validations</h2>
          {recentValidations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent auto-validations found
            </div>
          ) : (
            <div className="space-y-3">
              {recentValidations.map((validation) => (
                <div
                  key={validation.id}
                  className={`p-4 rounded-lg border ${
                    validation.autoValidated
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{validation.title}</h3>
                      <div className="text-sm text-gray-600 mt-1">{validation.url}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          validation.autoValidated
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {validation.autoValidated ? 'APPROVED' : 'REJECTED'}
                        </span>
                        <span className="text-gray-500">
                          Score: {validation.autoValidationScore}
                        </span>
                        <span className="text-gray-500">
                          Seed: {validation.seedingScore}
                        </span>
                        <span className="text-gray-500">
                          {new Date(validation.autoValidatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2">Auto-Validation Thresholds</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Auto-Approve: Score ≥ 75</li>
                <li>• Auto-Reject: Score ≤ 30</li>
                <li>• Manual Review: Score 31-74</li>
                <li>• IndieWeb Bonus: +15 points</li>
                <li>• Good Metadata Bonus: +10 points</li>
                <li>• Personal Domain Bonus: +10 points</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Queue Separation (Phase 2)</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Human submissions → Community validation</li>
                <li>• Crawler submissions → Auto-validation</li>
                <li>• Manual override available for admins</li>
                <li>• Community queue focuses on quality curation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const [siteConfig, user] = await Promise.all([
      getSiteConfig(),
      getSessionUser(context.req as any)
    ]);

    return {
      props: {
        siteConfig,
        user: user || null,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true,
    };
  }
};