import React, { useState, useEffect } from 'react';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface BetaLandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  content?: string;
  isActive: boolean;
  isPaused: boolean;
  signupLimit: number;
  signupCount: number;
  limitReached: boolean;
  endedAt?: string;
  createdAt: string;
  creator: {
    id: string;
    profile?: { displayName: string };
    primaryHandle?: string;
  };
  ender?: {
    id: string;
    profile?: { displayName: string };
    primaryHandle?: string;
  };
  _count: {
    signups: number;
    attempts: number;
  };
}

interface Analytics {
  landingPage: {
    id: string;
    name: string;
    slug: string;
    title: string;
    isActive: boolean;
    isPaused: boolean;
    signupLimit: number;
    signupCount: number;
    limitReached: boolean;
    createdAt: string;
    endedAt?: string;
  };
  metrics: {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    totalSignups: number;
    startedSignups: number;
    completedSignups: number;
    abandonedSignups: number;
    conversionRate: number;
    completionRate: number;
    averageTimeToCompleteMinutes: number;
  };
  dailyData: Array<{
    date: string;
    started: number;
    completed: number;
    abandoned: number;
  }>;
  topIPs: Array<{
    ipAddress: string;
    signupCount: number;
  }>;
}

export default function BetaLandingPagesSection() {
  const [landingPages, setLandingPages] = useState<BetaLandingPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPage, setEditingPage] = useState<BetaLandingPage | null>(null);
  const [viewingAnalytics, setViewingAnalytics] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    title: '',
    description: '',
    content: '',
    signupLimit: 50
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadLandingPages();
  }, []);

  const loadLandingPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/beta-landing-pages');
      if (response.ok) {
        const data = await response.json();
        setLandingPages(data.landingPages);
      } else {
        setError('Failed to load landing pages');
      }
    } catch (err) {
      setError('Failed to load landing pages');
      console.error('Error loading landing pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (pageId: string) => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch(`/api/admin/beta-landing-pages/${pageId}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        setError('Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Error loading analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.title) {
      setError('Name, slug, and title are required');
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      const response = await csrfFetch('/api/admin/beta-landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadLandingPages();
        setShowCreateForm(false);
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create landing page');
      }
    } catch (err) {
      setError('Failed to create landing page');
      console.error('Error creating landing page:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage || !formData.name || !formData.slug || !formData.title) {
      setError('Name, slug, and title are required');
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      const response = await csrfFetch(`/api/admin/beta-landing-pages/${editingPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadLandingPages();
        setEditingPage(null);
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update landing page');
      }
    } catch (err) {
      setError('Failed to update landing page');
      console.error('Error updating landing page:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCampaignAction = async (pageId: string, action: 'pause' | 'resume' | 'end') => {
    try {
      const response = await csrfFetch(`/api/admin/beta-landing-pages/${pageId}/${action}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadLandingPages();
        const data = await response.json();
        setError(null);
        // Show success message briefly
        const successMessage = data.message;
        setError(`✅ ${successMessage}`);
        setTimeout(() => setError(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} campaign`);
      }
    } catch (err) {
      setError(`Failed to ${action} campaign`);
      console.error(`Error ${action}ing campaign:`, err);
    }
  };

  const handleUpdateLimit = async (pageId: string, newLimit: number) => {
    try {
      const response = await csrfFetch(`/api/admin/beta-landing-pages/${pageId}/limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupLimit: newLimit })
      });

      if (response.ok) {
        await loadLandingPages();
        const data = await response.json();
        setError(`✅ ${data.message}`);
        setTimeout(() => setError(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update limit');
      }
    } catch (err) {
      setError('Failed to update limit');
      console.error('Error updating limit:', err);
    }
  };

  const handleDelete = async (pageId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the landing page "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/beta-landing-pages/${pageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadLandingPages();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete landing page');
      }
    } catch (err) {
      setError('Failed to delete landing page');
      console.error('Error deleting landing page:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      title: '',
      description: '',
      content: '',
      signupLimit: 50
    });
  };

  const startEdit = (page: BetaLandingPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      slug: page.slug,
      title: page.title,
      description: page.description || '',
      content: page.content || '',
      signupLimit: page.signupLimit
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingPage(null);
    setShowCreateForm(false);
    resetForm();
  };

  const viewAnalytics = (pageId: string) => {
    setViewingAnalytics(pageId);
    loadAnalytics(pageId);
  };

  const getStatusBadge = (page: BetaLandingPage) => {
    if (page.endedAt) {
      return <span className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded">Ended</span>;
    }
    if (!page.isActive) {
      return <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Inactive</span>;
    }
    if (page.isPaused) {
      return <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">Paused</span>;
    }
    if (page.limitReached) {
      return <span className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded">Limit Reached</span>;
    }
    return <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Active</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        🎯 Beta Landing Pages
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Create custom landing pages for beta campaigns with unique URLs, signup tracking, and analytics.
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

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            if (showCreateForm) cancelEdit();
          }}
          className="border border-black px-3 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000]"
        >
          {showCreateForm ? 'Cancel' : 'Create New Landing Page'}
        </button>
        <button
          onClick={loadLandingPages}
          disabled={loading}
          className="border border-black px-3 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="border border-black p-4 bg-yellow-50 mb-4">
          <h4 className="font-bold mb-3">
            {editingPage ? 'Edit Landing Page' : 'Create New Landing Page'}
          </h4>
          <form onSubmit={editingPage ? handleUpdate : handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Campaign Name</label>
                <input
                  type="text"
                  className="w-full border border-black p-2 bg-white text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Community Launch Campaign"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Internal name for admin reference</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL Slug</label>
                <input
                  type="text"
                  className="w-full border border-black p-2 bg-white text-sm"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '')})}
                  placeholder="community-launch"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Will be available at /beta/{formData.slug || 'your-slug'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Page Title</label>
              <input
                type="text"
                className="w-full border border-black p-2 bg-white text-sm"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Join Our Community Beta!"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Main heading shown to visitors</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <input
                type="text"
                className="w-full border border-black p-2 bg-white text-sm"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Get early access and connect with our community"
              />
              <p className="text-xs text-gray-500 mt-1">Subtitle text below the title</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Custom Content (Optional HTML)</label>
              <textarea
                className="w-full border border-black p-2 bg-white text-sm font-mono"
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="<div style='text-align: center; padding: 2rem;'>
  <h2>Special Offer!</h2>
  <p>Join now and get exclusive early access features.</p>
  <ul>
    <li>Priority support</li>
    <li>Beta feature previews</li>
    <li>Community recognition</li>
  </ul>
</div>"
              />
              <p className="text-xs text-gray-500 mt-1">Custom HTML content to display on the landing page</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Signup Limit</label>
              <input
                type="number"
                className="w-full border border-black p-2 bg-white text-sm"
                value={formData.signupLimit}
                onChange={(e) => setFormData({...formData, signupLimit: Math.max(1, parseInt(e.target.value) || 1)})}
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum number of signups allowed</p>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={formLoading}
                className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : (editingPage ? 'Update Landing Page' : 'Create Landing Page')}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={formLoading}
                className="border border-black px-4 py-2 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Analytics Modal */}
      {viewingAnalytics && analytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-lg max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-xl">📊 Campaign Analytics</h2>
              <button
                onClick={() => {
                  setViewingAnalytics(null);
                  setAnalytics(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="border border-gray-200 p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2">{analytics.landingPage.name}</h3>
              <p className="text-sm text-gray-600">Campaign: {analytics.landingPage.title}</p>
              <p className="text-sm text-gray-600">URL: /beta/{analytics.landingPage.slug}</p>
              <p className="text-sm text-gray-600">
                Status: {analytics.landingPage.endedAt ? 'Ended' : analytics.landingPage.isPaused ? 'Paused' : 'Active'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-gray-200 p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{analytics.metrics.totalSignups}</div>
                <div className="text-sm text-gray-600">Total Signups</div>
              </div>
              <div className="border border-gray-200 p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{analytics.metrics.completedSignups}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="border border-gray-200 p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">{analytics.metrics.conversionRate}%</div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
              </div>
              <div className="border border-gray-200 p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{analytics.metrics.averageTimeToCompleteMinutes}m</div>
                <div className="text-sm text-gray-600">Avg. Time</div>
              </div>
            </div>

            {analytics.topIPs.length > 0 && (
              <div className="border border-gray-200 p-4 bg-gray-50 rounded">
                <h4 className="font-bold mb-2">Top IP Addresses</h4>
                <div className="space-y-1">
                  {analytics.topIPs.slice(0, 5).map((ip, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="font-mono">{ip.ipAddress}</span>
                      <span>{ip.signupCount} signup{ip.signupCount !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => {
                  setViewingAnalytics(null);
                  setAnalytics(null);
                }}
                className="border border-black px-6 py-2 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landing Pages List */}
      {loading ? (
        <div className="text-center py-8">Loading landing pages...</div>
      ) : landingPages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No beta landing pages created yet. Create your first campaign above!
        </div>
      ) : (
        <div className="space-y-3">
          {landingPages.map(page => (
            <div key={page.id} className="border border-black p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg">{page.name}</h4>
                  <p className="text-sm text-gray-600">{page.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <a
                      href={`/beta/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      /beta/{page.slug} ↗
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(page)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold">{page.signupCount}</div>
                  <div className="text-xs text-gray-600">Signups</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{page.signupLimit}</div>
                  <div className="text-xs text-gray-600">Limit</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{page._count.attempts}</div>
                  <div className="text-xs text-gray-600">Attempts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {page.signupCount > 0 ? Math.round((page.signupCount / Math.max(page._count.attempts, 1)) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{page.signupCount} / {page.signupLimit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      page.limitReached ? 'bg-red-600' : 'bg-green-600'
                    }`}
                    style={{
                      width: `${Math.min(100, (page.signupCount / page.signupLimit) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => viewAnalytics(page.id)}
                  className="border border-black px-3 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-sm"
                >
                  📊 Analytics
                </button>

                <button
                  onClick={() => startEdit(page)}
                  className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[1px_1px_0_#000] text-sm"
                >
                  ✏️ Edit
                </button>

                {!page.endedAt && (
                  <>
                    {page.isPaused ? (
                      <button
                        onClick={() => handleCampaignAction(page.id, 'resume')}
                        className="border border-black px-3 py-1 bg-green-200 hover:bg-green-100 shadow-[1px_1px_0_#000] text-sm"
                      >
                        ▶️ Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCampaignAction(page.id, 'pause')}
                        className="border border-black px-3 py-1 bg-orange-200 hover:bg-orange-100 shadow-[1px_1px_0_#000] text-sm"
                      >
                        ⏸️ Pause
                      </button>
                    )}

                    <button
                      onClick={() => handleCampaignAction(page.id, 'end')}
                      className="border border-black px-3 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-sm"
                    >
                      🛑 End Campaign
                    </button>
                  </>
                )}

                {page.limitReached && !page.endedAt && (
                  <button
                    onClick={() => {
                      const newLimit = prompt(`Current limit: ${page.signupLimit}. Enter new limit:`, String(page.signupLimit + 50));
                      if (newLimit && !isNaN(Number(newLimit)) && Number(newLimit) > page.signupLimit) {
                        handleUpdateLimit(page.id, Number(newLimit));
                      }
                    }}
                    className="border border-black px-3 py-1 bg-purple-200 hover:bg-purple-100 shadow-[1px_1px_0_#000] text-sm"
                  >
                    📈 Increase Limit
                  </button>
                )}

                <button
                  onClick={() => handleDelete(page.id, page.name)}
                  className="border border-black px-3 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-sm"
                >
                  🗑️ Delete
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                <p>Created: {formatDate(page.createdAt)} by {page.creator.profile?.displayName || page.creator.primaryHandle || 'Unknown'}</p>
                {page.endedAt && page.ender && (
                  <p>Ended: {formatDate(page.endedAt)} by {page.ender.profile?.displayName || page.ender.primaryHandle || 'Unknown'}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}