/**
 * Admin dashboard for webcrawler management
 */

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  oldestPending?: string;
  newestCompleted?: string;
}

interface HealthStats {
  successRate: number;
  averageCrawlTime: number;
  recentErrors: string[];
}

interface LogEntry {
  id: string;
  url: string;
  status: string;
  attempts: number;
  lastAttempt: string;
  errorMessage?: string;
  priority: number;
  createdAt: string;
}

interface QueueItem {
  id: string;
  url: string;
  priority: number;
  scheduledFor: string;
  attempts: number;
  lastAttempt?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface DetailedCrawlResult {
  url: string;
  status: 'success' | 'failed' | 'rejected';
  extractedData?: {
    title: string;
    description?: string;
    snippet: string;
    keywords: string[];
    links: string[];
    language?: string;
    contentLength: number;
    hasIndieWebMarkers: boolean;
    techStack?: string[];
    isPersonalSite?: boolean;
  };
  qualityScore?: {
    totalScore: number;
    breakdown: {
      indieWeb: number;
      personalSite: number;
      contentQuality: number;
      techStack: number;
      language: number;
      freshness: number;
    };
    shouldAutoSubmit: boolean;
    reasons: string[];
    category: string;
  };
  action?: 'added_for_validation' | 'updated_existing' | 'rejected_low_score';
  errorMessage?: string;
  crawlTime?: number;
}

interface Props {
  siteConfig: SiteConfig;
}

export default function CrawlerAdmin({ siteConfig }: Props) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('');
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueSearch, setQueueSearch] = useState('');

  // Add URL form
  const [newUrl, setNewUrl] = useState('');
  const [newPriority, setNewPriority] = useState(3);
  const [extractAllLinks, setExtractAllLinks] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);

  // Crawler options
  const [batchSize, setBatchSize] = useState(10);
  const [concurrency, setConcurrency] = useState(3);

  // Detailed results
  const [detailedResults, setDetailedResults] = useState<DetailedCrawlResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DetailedCrawlResult | null>(null);

  // Test crawl
  const [testUrl, setTestUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DetailedCrawlResult | null>(null);

  // Running individual items
  const [runningItemId, setRunningItemId] = useState<string | null>(null);

  // Blocked sites management
  const [blockedSites, setBlockedSites] = useState<any[]>([]);
  const [blockedSitesCategories, setBlockedSitesCategories] = useState<{ category: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');
  const [newBlockedCategory, setNewBlockedCategory] = useState('social_media');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const [addingBlockedSite, setAddingBlockedSite] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);

  useEffect(() => {
    fetchData();
    fetchBlockedSites();
  }, []);

  useEffect(() => {
    fetchQueueItems();
  }, [queuePage, queueSearch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchLogs(),
        fetchQueueItems()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/crawler/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.queueStats);

        // Fetch enhanced stats for health metrics
        const enhancedResponse = await fetch('/api/admin/crawler/stats');
        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json();
          // This could be enhanced to use a new endpoint
          setHealth({
            successRate: 0.85, // Placeholder
            averageCrawlTime: 0,
            recentErrors: []
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (logFilter) params.append('status', logFilter);

      const response = await fetch(`/api/admin/crawler/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const fetchQueueItems = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', queuePage.toString());
      params.append('limit', '20');
      params.append('status', 'pending');
      if (queueSearch) params.append('search', queueSearch);

      const response = await fetch(`/api/admin/crawler/queue?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.items);
        setQueueTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch queue items:', error);
    }
  };

  const runCrawler = async () => {
    try {
      setRunning(true);
      const response = await fetch('/api/admin/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize, concurrency })
      });

      if (response.ok) {
        const data = await response.json();
        setDetailedResults(data.crawlStats.detailedResults || []);
        setShowResults(true);
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Crawler run failed');
      }
    } catch (error) {
      console.error('Failed to run crawler:', error);
      alert('Failed to run crawler');
    } finally {
      setRunning(false);
    }
  };

  const testCrawl = async (url: string) => {
    try {
      setTesting(true);
      setTestResult(null);
      const response = await fetch('/api/admin/crawler/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(data.result);
        setSelectedResult(data.result);
      } else {
        const error = await response.json();
        alert(error.error || 'Test crawl failed');
      }
    } catch (error) {
      console.error('Failed to test crawl:', error);
      alert('Failed to test crawl');
    } finally {
      setTesting(false);
    }
  };

  const runQueueItem = async (itemId: string) => {
    try {
      setRunningItemId(itemId);
      const response = await fetch('/api/admin/crawler/run-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.detailedResult) {
          setDetailedResults([data.detailedResult]);
          setSelectedResult(data.detailedResult);
          setShowResults(true);
        }
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to run item');
      }
    } catch (error) {
      console.error('Failed to run queue item:', error);
      alert('Failed to run item');
    } finally {
      setRunningItemId(null);
    }
  };

  const addUrlToQueue = async () => {
    if (!newUrl) return;

    try {
      setAddingUrl(true);
      const response = await fetch('/api/admin/crawler/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          priority: newPriority,
          extractAllLinks
        })
      });

      if (response.ok) {
        alert('URL added to queue successfully');
        setNewUrl('');
        setNewPriority(3);
        setExtractAllLinks(false);
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add URL');
      }
    } catch (error) {
      console.error('Failed to add URL:', error);
      alert('Failed to add URL');
    } finally {
      setAddingUrl(false);
    }
  };

  const retryFailed = async () => {
    if (!confirm('Retry all failed items?')) return;

    try {
      const response = await fetch('/api/admin/crawler/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Reset ${data.retriedCount} failed items to pending`);
        await fetchData();
      } else {
        alert('Failed to retry items');
      }
    } catch (error) {
      console.error('Failed to retry:', error);
      alert('Failed to retry items');
    }
  };

  const cleanupOld = async () => {
    if (!confirm('Clean up completed items older than 30 days?')) return;

    try {
      const response = await fetch('/api/admin/crawler/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: 30 })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Cleaned up ${data.deletedCount} old items`);
        await fetchData();
      } else {
        alert('Failed to cleanup items');
      }
    } catch (error) {
      console.error('Failed to cleanup:', error);
      alert('Failed to cleanup items');
    }
  };

  // Blocked sites handlers
  const fetchBlockedSites = async () => {
    try {
      const url = selectedCategory
        ? `/api/admin/blocked-sites?category=${selectedCategory}`
        : '/api/admin/blocked-sites';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBlockedSites(data.sites);
        setBlockedSitesCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch blocked sites:', error);
    }
  };

  const addBlockedSite = async () => {
    if (!newBlockedDomain) return;

    try {
      setAddingBlockedSite(true);
      const response = await fetch('/api/admin/blocked-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newBlockedDomain,
          category: newBlockedCategory,
          reason: newBlockedReason || undefined
        })
      });

      if (response.ok) {
        alert('Blocked site added successfully');
        setNewBlockedDomain('');
        setNewBlockedCategory('social_media');
        setNewBlockedReason('');
        await fetchBlockedSites();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add blocked site');
      }
    } catch (error) {
      console.error('Failed to add blocked site:', error);
      alert('Failed to add blocked site');
    } finally {
      setAddingBlockedSite(false);
    }
  };

  const deleteBlockedSite = async (id: string, domain: string) => {
    if (!confirm(`Remove ${domain} from blocked list?`)) return;

    try {
      const response = await fetch(`/api/admin/blocked-sites/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Blocked site removed successfully');
        await fetchBlockedSites();
      } else {
        alert('Failed to remove blocked site');
      }
    } catch (error) {
      console.error('Failed to delete blocked site:', error);
      alert('Failed to delete blocked site');
    }
  };

  const previewCleanup = async () => {
    try {
      setCleaningUp(true);
      const response = await fetch('/api/admin/blocked-sites/cleanup?dryRun=true', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setCleanupReport(data);
        setShowCleanupModal(true);
      } else {
        alert('Failed to preview cleanup');
      }
    } catch (error) {
      console.error('Failed to preview cleanup:', error);
      alert('Failed to preview cleanup');
    } finally {
      setCleaningUp(false);
    }
  };

  const executeCleanup = async () => {
    if (!confirm('Execute cleanup? This will mark affected sites as rejected and remove them from the crawl queue.')) return;

    try {
      setCleaningUp(true);
      const response = await fetch('/api/admin/blocked-sites/cleanup?dryRun=false', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setCleanupReport(data);
        alert(`Cleanup completed! Updated ${data.totalAffected.indexedSites} indexed sites and removed ${data.totalAffected.crawlQueue} queue items.`);
        setShowCleanupModal(false);
        await fetchData();
      } else {
        alert('Failed to execute cleanup');
      }
    } catch (error) {
      console.error('Failed to execute cleanup:', error);
      alert('Failed to execute cleanup');
    } finally {
      setCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchBlockedSites();
  }, [selectedCategory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderDetailedResult = (result: DetailedCrawlResult) => {
    const actionColorMap: Record<string, string> = {
      'added_for_validation': 'bg-green-100 border-green-300',
      'updated_existing': 'bg-blue-100 border-blue-300',
      'rejected_low_score': 'bg-red-100 border-red-300'
    };
    const actionColor = actionColorMap[result.action || ''] || 'bg-gray-100 border-gray-300';

    const statusEmoji = {
      'success': '✅',
      'failed': '❌',
      'rejected': '⏭️'
    }[result.status];

    return (
      <div className={`border-2 rounded-lg p-4 ${actionColor}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg flex items-center gap-2">
              {statusEmoji} {result.extractedData?.title || result.url}
            </h3>
            <p className="text-sm text-gray-600 truncate">{result.url}</p>
          </div>
          {result.qualityScore && (
            <div className="text-right ml-4">
              <div className="text-2xl font-bold">{result.qualityScore.totalScore}</div>
              <div className="text-xs text-gray-600">Quality Score</div>
            </div>
          )}
        </div>

        {result.errorMessage && (
          <div className="bg-red-50 border border-red-300 rounded p-2 mb-3 text-sm text-red-700">
            {result.errorMessage}
          </div>
        )}

        {result.extractedData && (
          <div className="space-y-2 mb-3">
            <div>
              <strong className="text-sm">Description:</strong>
              <p className="text-sm text-gray-700">{result.extractedData.description || result.extractedData.snippet.substring(0, 200)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Language:</strong> {result.extractedData.language || 'Unknown'}</div>
              <div><strong>Content Length:</strong> {result.extractedData.contentLength} chars</div>
              <div><strong>Indie Web Markers:</strong> {result.extractedData.hasIndieWebMarkers ? '✓ Yes' : '✗ No'}</div>
              <div><strong>Personal Site:</strong> {result.extractedData.isPersonalSite ? '✓ Yes' : '✗ No'}</div>
            </div>
            {result.extractedData.keywords.length > 0 && (
              <div className="text-sm">
                <strong>Keywords:</strong> {result.extractedData.keywords.slice(0, 10).join(', ')}
              </div>
            )}
            {result.extractedData.techStack && result.extractedData.techStack.length > 0 && (
              <div className="text-sm">
                <strong>Tech Stack:</strong> {result.extractedData.techStack.join(', ')}
              </div>
            )}
          </div>
        )}

        {result.qualityScore && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Quality Breakdown:</div>
            <div className="space-y-1 text-sm">
              {Object.entries(result.qualityScore.breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-32 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(value / 25) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <strong className="text-sm">Reasons:</strong>
              <ul className="text-sm list-disc list-inside">
                {result.qualityScore.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2 text-sm">
              <strong>Category:</strong> <span className="capitalize">{result.qualityScore.category}</span>
            </div>
            {result.action && (
              <div className="mt-2 text-sm font-medium">
                <strong>Action:</strong> {result.action.replace(/_/g, ' ').toUpperCase()}
              </div>
            )}
          </div>
        )}

        {result.crawlTime !== undefined && (
          <div className="mt-3 text-xs text-gray-500">
            Crawl Time: {result.crawlTime}ms
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🕷️ Webcrawler Dashboard</h1>
          <p className="text-gray-600">
            Monitor and manage the automated site crawler and queue
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-300">
                <div className="text-3xl font-bold text-yellow-600">{stats?.pending || 0}</div>
                <div className="text-gray-600 text-sm">Pending</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-300">
                <div className="text-3xl font-bold text-blue-600">{stats?.processing || 0}</div>
                <div className="text-gray-600 text-sm">Processing</div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg border border-green-300">
                <div className="text-3xl font-bold text-green-600">{stats?.completed || 0}</div>
                <div className="text-gray-600 text-sm">Completed</div>
              </div>
              <div className="bg-red-50 p-6 rounded-lg border border-red-300">
                <div className="text-3xl font-bold text-red-600">{stats?.failed || 0}</div>
                <div className="text-gray-600 text-sm">Failed</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-300">
                <div className="text-3xl font-bold text-purple-600">{stats?.total || 0}</div>
                <div className="text-gray-600 text-sm">Total</div>
              </div>
            </div>

            {/* Manual Controls */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🎮 Manual Controls</h2>

              <div className="space-y-6">
                {/* Run Crawler */}
                <div>
                  <h3 className="font-medium mb-3">Run Crawler Now</h3>
                  <div className="flex gap-4 items-end">
                    <div>
                      <label className="block text-sm mb-1">Batch Size</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Concurrency</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={concurrency}
                        onChange={(e) => setConcurrency(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={runCrawler}
                      disabled={running}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {running ? '⏳ Running...' : '▶️ Run Crawler'}
                    </button>
                  </div>
                </div>

                {/* Add URL */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Add URL to Queue</h3>
                  <div className="flex gap-4 items-end mb-3">
                    <div className="flex-1">
                      <label className="block text-sm mb-1">URL</label>
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Priority (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={newPriority}
                        onChange={(e) => setNewPriority(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={addUrlToQueue}
                      disabled={addingUrl || !newUrl}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {addingUrl ? '⏳ Adding...' : '➕ Add URL'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="extractAllLinks"
                      checked={extractAllLinks}
                      onChange={(e) => setExtractAllLinks(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="extractAllLinks" className="text-sm">
                      Extract all links (for webring/directory pages with 100+ links)
                    </label>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-6 flex gap-4">
                  <button
                    onClick={retryFailed}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    🔄 Retry Failed Items
                  </button>
                  <button
                    onClick={cleanupOld}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    🧹 Cleanup Old Items
                  </button>
                </div>

                {/* Test Crawl */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">🧪 Test Crawl URL</h3>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm mb-1">URL to Test</label>
                      <input
                        type="url"
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => testCrawl(testUrl)}
                      disabled={testing || !testUrl}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                    >
                      {testing ? '⏳ Testing...' : '🧪 Test Crawl'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Test crawl a URL without adding it to the queue. View extracted data and quality scoring.
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Results Modal/Section */}
            {showResults && detailedResults.length > 0 && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">📊 Crawl Results ({detailedResults.length})</h2>
                  <button
                    onClick={() => setShowResults(false)}
                    className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="mb-4 flex gap-2 text-sm">
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                    ✅ Success: {detailedResults.filter(r => r.status === 'success' && r.action !== 'rejected_low_score').length}
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                    ⏭️ Rejected: {detailedResults.filter(r => r.status === 'rejected' || r.action === 'rejected_low_score').length}
                  </span>
                  <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded">
                    ❌ Failed: {detailedResults.filter(r => r.status === 'failed').length}
                  </span>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {detailedResults.map((result, index) => (
                    <div key={index}>
                      {renderDetailedResult(result)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">🧪 Test Crawl Result</h2>
                  <button
                    onClick={() => setTestResult(null)}
                    className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                  >
                    ✕ Close
                  </button>
                </div>
                {renderDetailedResult(testResult)}
              </div>
            )}

            {/* Recent Activity Log */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📋 Recent Activity</h2>
                <select
                  value={logFilter}
                  onChange={(e) => {
                    setLogFilter(e.target.value);
                    fetchLogs();
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activity logs yet</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {log.priority} | Attempts: {log.attempts}
                          </span>
                        </div>
                        <div className="text-sm truncate" title={log.url}>
                          {log.url}
                        </div>
                        {log.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {log.errorMessage}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                        {formatDate(log.lastAttempt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Queue Browser */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📑 Pending Queue ({queueTotal})</h2>
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => {
                    setQueueSearch(e.target.value);
                    setQueuePage(1);
                  }}
                  placeholder="Search URLs..."
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">URL</th>
                      <th className="text-left py-2 px-2">Priority</th>
                      <th className="text-left py-2 px-2">Scheduled</th>
                      <th className="text-left py-2 px-2">Attempts</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No pending items in queue
                        </td>
                      </tr>
                    ) : (
                      queueItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 truncate max-w-md" title={item.url}>
                            {item.url}
                          </td>
                          <td className="py-2 px-2">{item.priority}</td>
                          <td className="py-2 px-2 text-xs">
                            {formatDate(item.scheduledFor)}
                          </td>
                          <td className="py-2 px-2">{item.attempts}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {item.status === 'pending' && (
                              <button
                                onClick={() => runQueueItem(item.id)}
                                disabled={runningItemId === item.id}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                              >
                                {runningItemId === item.id ? '⏳' : '▶️ Run Now'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {queueTotal > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                    disabled={queuePage === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {queuePage} of {Math.ceil(queueTotal / 20)}
                  </span>
                  <button
                    onClick={() => setQueuePage(p => p + 1)}
                    disabled={queuePage >= Math.ceil(queueTotal / 20)}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Blocked Sites Management */}
            <div className="border-t-4 border-red-300 pt-6 mt-6">
              <h2 className="text-2xl font-bold mb-4">🚫 Blocked Sites Management</h2>

              {/* Category Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {blockedSitesCategories.map((cat) => (
                  <div
                    key={cat.category}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                      selectedCategory === cat.category
                        ? 'bg-red-100 border-red-400'
                        : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedCategory(selectedCategory === cat.category ? '' : cat.category)}
                  >
                    <div className="text-xs text-gray-600 mb-1">{cat.category.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="text-2xl font-bold">{cat.count}</div>
                  </div>
                ))}
              </div>

              {/* Add Blocked Site Form */}
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300 mb-6">
                <h3 className="text-lg font-semibold mb-3">Add Blocked Site</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Domain (e.g., example.com)"
                    value={newBlockedDomain}
                    onChange={(e) => setNewBlockedDomain(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                  <select
                    value={newBlockedCategory}
                    onChange={(e) => setNewBlockedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="social_media">Social Media</option>
                    <option value="big_tech">Big Tech</option>
                    <option value="news_media">News Media</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="knowledge_base">Knowledge Base</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={newBlockedReason}
                    onChange={(e) => setNewBlockedReason(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={addBlockedSite}
                    disabled={addingBlockedSite || !newBlockedDomain}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {addingBlockedSite ? '⏳ Adding...' : '➕ Add'}
                  </button>
                </div>
              </div>

              {/* Blocked Sites List */}
              <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                  <h3 className="font-semibold">
                    {selectedCategory
                      ? `${selectedCategory.replace(/_/g, ' ').toUpperCase()} (${blockedSites.length})`
                      : `All Blocked Sites (${blockedSites.length})`
                    }
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left text-xs font-semibold">Domain</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold">Category</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold">Reason</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedSites.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            {selectedCategory ? 'No blocked sites in this category' : 'No blocked sites found'}
                          </td>
                        </tr>
                      ) : (
                        blockedSites.map((site) => (
                          <tr key={site.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-sm">{site.domain}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                {site.category.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600 max-w-xs truncate" title={site.reason || ''}>
                              {site.reason || '-'}
                            </td>
                            <td className="py-2 px-3">
                              <button
                                onClick={() => deleteBlockedSite(site.id, site.domain)}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                🗑️ Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cleanup Section */}
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-300">
                <h3 className="text-lg font-semibold mb-3">🧹 Cleanup Existing Entries</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Remove sites from the index that match the current blocked list. This will mark them as rejected
                  in the IndexedSite table and remove them from the CrawlQueue.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={previewCleanup}
                    disabled={cleaningUp}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {cleaningUp ? '⏳ Loading...' : '🔍 Preview Cleanup'}
                  </button>
                </div>
              </div>

              {/* Cleanup Modal */}
              {showCleanupModal && cleanupReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">Cleanup Preview</h3>

                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="text-sm text-gray-600">Indexed Sites Affected</div>
                        <div className="text-2xl font-bold">{cleanupReport.totalAffected.indexedSites}</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded">
                        <div className="text-sm text-gray-600">Queue Items to Remove</div>
                        <div className="text-2xl font-bold">{cleanupReport.totalAffected.crawlQueue}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Breakdown by Category:</h4>
                      {Object.entries(cleanupReport.summary).map(([category, counts]: [string, any]) => (
                        <div key={category} className="flex justify-between py-1 text-sm">
                          <span className="font-mono">{category.replace(/_/g, ' ')}</span>
                          <span>
                            IndexedSites: {counts.indexedSites}, Queue: {counts.crawlQueue}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Sample Affected Sites:</h4>
                      <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                        {cleanupReport.affectedSites.indexedSites.slice(0, 10).map((site: any, idx: number) => (
                          <div key={idx} className="text-xs py-1">
                            <span className="font-mono">{site.url}</span> - {site.title}
                          </div>
                        ))}
                        {cleanupReport.affectedSites.indexedSites.length > 10 && (
                          <div className="text-xs text-gray-500 py-1">
                            ... and {cleanupReport.affectedSites.indexedSites.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowCleanupModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeCleanup}
                        disabled={cleaningUp}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        {cleaningUp ? '⏳ Cleaning...' : '🚀 Execute Cleanup'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="flex gap-4">
              <a
                href="/admin/community-index"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                🌐 Community Index
              </a>
              <a
                href="/admin/auto-validation"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                ✅ Auto-Validation
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
