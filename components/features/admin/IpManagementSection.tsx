import React, { useState, useEffect } from 'react';

interface IpTracking {
  id: string;
  ipAddress: string;
  signupAttempts: number;
  successfulSignups: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  isBlocked: boolean;
  blockedAt?: string;
  blockedBy?: string;
  blockedReason?: string;
  autoBlocked: boolean;
  unblockAt?: string;
  blocker?: {
    id: string;
    profile?: { displayName: string };
    primaryHandle?: string;
  };
  recentAttempts: {
    totalAttempts: number;
    successfulAttempts: number;
  };
  successRate: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function IpManagementSection() {
  const [ipTracking, setIpTracking] = useState<IpTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [showBlocked, setShowBlocked] = useState(false);

  // Bulk block form
  const [showBulkBlock, setShowBulkBlock] = useState(false);
  const [bulkIpList, setBulkIpList] = useState('');
  const [bulkBlockReason, setBulkBlockReason] = useState('Manual bulk block');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadIpTracking();
  }, [pagination.page, showBlocked]);

  const loadIpTracking = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        blocked: showBlocked.toString()
      });

      const response = await fetch(`/api/admin/ip-tracking?${params}`);
      if (response.ok) {
        const data = await response.json();
        setIpTracking(data.ipTracking);
        setPagination(data.pagination);
      } else {
        setError('Failed to load IP tracking data');
      }
    } catch (err) {
      setError('Failed to load IP tracking data');
      console.error('Error loading IP tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIp = async (ipAddress: string, reason = 'Manual block') => {
    try {
      const response = await fetch(`/api/admin/ip-tracking/${encodeURIComponent(ipAddress)}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadIpTracking();
        setError(`✅ IP address ${ipAddress} has been blocked`);
        setTimeout(() => setError(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to block IP address');
      }
    } catch (err) {
      setError('Failed to block IP address');
      console.error('Error blocking IP:', err);
    }
  };

  const handleUnblockIp = async (ipAddress: string) => {
    try {
      const response = await fetch(`/api/admin/ip-tracking/${encodeURIComponent(ipAddress)}/unblock`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadIpTracking();
        setError(`✅ IP address ${ipAddress} has been unblocked`);
        setTimeout(() => setError(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to unblock IP address');
      }
    } catch (err) {
      setError('Failed to unblock IP address');
      console.error('Error unblocking IP:', err);
    }
  };

  const handleBulkBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkIpList.trim()) {
      setError('Please enter IP addresses to block');
      return;
    }

    setBulkLoading(true);
    setError(null);
    try {
      // Parse IP addresses from text area (one per line)
      const ipAddresses = bulkIpList
        .split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

      if (ipAddresses.length === 0) {
        setError('No valid IP addresses found');
        return;
      }

      const response = await fetch('/api/admin/ip-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddresses,
          reason: bulkBlockReason
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadIpTracking();
        setShowBulkBlock(false);
        setBulkIpList('');
        setBulkBlockReason('Manual bulk block');
        setError(`✅ ${data.message}`);
        setTimeout(() => setError(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to block IP addresses');
      }
    } catch (err) {
      setError('Failed to block IP addresses');
      console.error('Error bulk blocking IPs:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getBlockStatusBadge = (ip: IpTracking) => {
    if (!ip.isBlocked) {
      return <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Active</span>;
    }
    if (ip.autoBlocked && ip.unblockAt) {
      const unblockDate = new Date(ip.unblockAt);
      const now = new Date();
      if (now < unblockDate) {
        return <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">Auto-blocked (Temp)</span>;
      }
    }
    if (ip.autoBlocked) {
      return <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Auto-blocked</span>;
    }
    return <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Blocked</span>;
  };

  const getRiskLevel = (ip: IpTracking) => {
    // Calculate risk based on success rate and recent activity
    const { successRate, recentAttempts } = ip;

    if (ip.isBlocked) return 'blocked';
    if (successRate < 20 && ip.signupAttempts >= 5) return 'high';
    if (recentAttempts.totalAttempts > 5) return 'high';
    if (successRate < 50 && ip.signupAttempts >= 3) return 'medium';
    if (recentAttempts.totalAttempts > 2) return 'medium';
    return 'low';
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'blocked':
        return <span className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded">Blocked</span>;
      case 'high':
        return <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">High Risk</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">Medium Risk</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Low Risk</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded">Unknown</span>;
    }
  };

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        🛡️ IP Address Management
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Monitor signup attempts by IP address and manage blocked addresses to prevent spam and abuse.
      </p>

      {error && (
        <div className={`mb-4 p-3 border rounded ${
          error.startsWith('✅')
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowBlocked(!showBlocked)}
          className={`border border-black px-3 py-2 shadow-[2px_2px_0_#000] ${
            showBlocked
              ? 'bg-red-200 hover:bg-red-100'
              : 'bg-blue-200 hover:bg-blue-100'
          }`}
        >
          {showBlocked ? 'Show All IPs' : 'Show Blocked Only'}
        </button>

        <button
          onClick={() => setShowBulkBlock(!showBulkBlock)}
          className="border border-black px-3 py-2 bg-orange-200 hover:bg-orange-100 shadow-[2px_2px_0_#000]"
        >
          {showBulkBlock ? 'Cancel Bulk Block' : 'Bulk Block IPs'}
        </button>

        <button
          onClick={loadIpTracking}
          disabled={loading}
          className="border border-black px-3 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Bulk Block Form */}
      {showBulkBlock && (
        <div className="border border-black p-4 bg-yellow-50 mb-4">
          <h4 className="font-bold mb-3">Bulk Block IP Addresses</h4>
          <form onSubmit={handleBulkBlock} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">IP Addresses (one per line)</label>
              <textarea
                className="w-full border border-black p-2 bg-white text-sm font-mono"
                rows={6}
                value={bulkIpList}
                onChange={(e) => setBulkIpList(e.target.value)}
                placeholder="192.168.1.100
203.0.113.50
198.51.100.25"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter one IP address per line</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Block Reason</label>
              <input
                type="text"
                className="w-full border border-black p-2 bg-white text-sm"
                value={bulkBlockReason}
                onChange={(e) => setBulkBlockReason(e.target.value)}
                placeholder="Spam prevention"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={bulkLoading}
                className="border border-black px-4 py-2 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
              >
                {bulkLoading ? 'Blocking...' : 'Block All IPs'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkBlock(false);
                  setBulkIpList('');
                  setBulkBlockReason('Manual bulk block');
                }}
                className="border border-black px-4 py-2 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="border border-gray-200 p-3 bg-white rounded">
          <div className="text-lg font-bold">{pagination.total}</div>
          <div className="text-sm text-gray-600">Total IPs Tracked</div>
        </div>
        <div className="border border-gray-200 p-3 bg-red-50 rounded">
          <div className="text-lg font-bold text-red-600">
            {ipTracking.filter(ip => ip.isBlocked).length}
          </div>
          <div className="text-sm text-gray-600">Blocked IPs</div>
        </div>
        <div className="border border-gray-200 p-3 bg-yellow-50 rounded">
          <div className="text-lg font-bold text-yellow-600">
            {ipTracking.filter(ip => getRiskLevel(ip) === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High Risk IPs</div>
        </div>
        <div className="border border-gray-200 p-3 bg-orange-50 rounded">
          <div className="text-lg font-bold text-orange-600">
            {ipTracking.filter(ip => ip.recentAttempts.totalAttempts > 0).length}
          </div>
          <div className="text-sm text-gray-600">Recent Activity</div>
        </div>
      </div>

      {/* IP Tracking Table */}
      {loading ? (
        <div className="text-center py-8">Loading IP tracking data...</div>
      ) : ipTracking.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {showBlocked ? 'No blocked IP addresses found.' : 'No IP tracking data found.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border border-black text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-left">IP Address</th>
                  <th className="border border-black p-2 text-left">Status</th>
                  <th className="border border-black p-2 text-left">Risk</th>
                  <th className="border border-black p-2 text-left">Attempts</th>
                  <th className="border border-black p-2 text-left">Success Rate</th>
                  <th className="border border-black p-2 text-left">Recent (24h)</th>
                  <th className="border border-black p-2 text-left">Last Activity</th>
                  <th className="border border-black p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ipTracking.map(ip => (
                  <tr key={ip.id} className="hover:bg-gray-50">
                    <td className="border border-black p-2 font-mono">
                      {ip.ipAddress}
                    </td>
                    <td className="border border-black p-2">
                      {getBlockStatusBadge(ip)}
                    </td>
                    <td className="border border-black p-2">
                      {getRiskBadge(getRiskLevel(ip))}
                    </td>
                    <td className="border border-black p-2">
                      <div className="text-sm">
                        <div>{ip.signupAttempts} total</div>
                        <div className="text-green-600">{ip.successfulSignups} successful</div>
                      </div>
                    </td>
                    <td className="border border-black p-2">
                      <span className={`font-medium ${
                        ip.successRate >= 80 ? 'text-green-600' :
                        ip.successRate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(ip.successRate)}%
                      </span>
                    </td>
                    <td className="border border-black p-2">
                      <div className="text-sm">
                        <div>{ip.recentAttempts.totalAttempts} attempts</div>
                        <div className="text-green-600">{ip.recentAttempts.successfulAttempts} successful</div>
                      </div>
                    </td>
                    <td className="border border-black p-2 text-xs">
                      {formatDate(ip.lastAttemptAt)}
                    </td>
                    <td className="border border-black p-2">
                      <div className="flex gap-1">
                        {ip.isBlocked ? (
                          <button
                            onClick={() => handleUnblockIp(ip.ipAddress)}
                            className="border border-black px-2 py-1 bg-green-200 hover:bg-green-100 shadow-[1px_1px_0_#000] text-xs"
                            title="Unblock this IP address"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const reason = prompt('Enter block reason:', 'Suspicious activity');
                              if (reason) {
                                handleBlockIp(ip.ipAddress, reason);
                              }
                            }}
                            className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs"
                            title="Block this IP address"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} IPs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="border border-black px-3 py-1 bg-gray-200 hover:bg-gray-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page >= pagination.pages}
                  className="border border-black px-3 py-1 bg-gray-200 hover:bg-gray-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <div className="font-medium text-blue-800 mb-1">IP Management Tips:</div>
        <ul className="text-blue-700 space-y-1">
          <li>• <strong>High Risk:</strong> Low success rate (&lt;20%) with multiple attempts</li>
          <li>• <strong>Medium Risk:</strong> Moderate success rate (&lt;50%) or recent activity spikes</li>
          <li>• <strong>Auto-blocked:</strong> Automatically blocked due to suspicious patterns</li>
          <li>• <strong>Recent Activity:</strong> Signup attempts in the last 24 hours</li>
        </ul>
      </div>
    </div>
  );
}