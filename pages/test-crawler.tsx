/**
 * Test page for crawler functionality
 * Access at /test-crawler during development
 */

import { useState } from 'react';

export default function TestCrawler() {
  const [crawlResult, setCrawlResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [queueStats, setQueueStats] = useState<any>(null);

  const testSingleSite = async () => {
    setLoading(true);
    setCrawlResult(null);

    try {
      // Test with a simple site first
      const response = await fetch('https://example.com');

      setCrawlResult({
        success: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type'),
        message: response.ok ? 'Basic fetch successful' : 'Fetch failed'
      });
    } catch (error) {
      setCrawlResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getQueueStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/crawler/stats');
      const data = await response.json();
      setQueueStats(data);
    } catch (error) {
      console.error('Failed to get queue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCrawler = async () => {
    setLoading(true);
    setCrawlResult(null);

    try {
      const response = await fetch('/api/admin/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 2, concurrency: 1 })
      });

      const data = await response.json();
      setCrawlResult(data);
    } catch (error) {
      setCrawlResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🕷️ Crawler Test Page</h1>

      <div className="space-y-6">
        {/* Basic Network Test */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Basic Network Test</h2>
          <button
            onClick={testSingleSite}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Basic Fetch'}
          </button>
        </div>

        {/* Queue Stats */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Crawl Queue Stats</h2>
          <button
            onClick={getQueueStats}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get Queue Stats'}
          </button>
        </div>

        {/* Run Crawler */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Run Crawler Worker</h2>
          <p className="text-sm text-gray-600 mb-3">
            This will attempt to crawl 2 sites from the queue (admin only)
          </p>
          <button
            onClick={runCrawler}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Crawling...' : 'Run Crawler'}
          </button>
        </div>

        {/* Results */}
        {queueStats && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Queue Statistics:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(queueStats, null, 2)}
            </pre>
          </div>
        )}

        {crawlResult && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold mb-2">
              {crawlResult.success ? '✅ Result:' : '❌ Error:'}
            </h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(crawlResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}