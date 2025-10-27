/**
 * Admin UI for managing curated sites for the "Surprise Me" feature
 */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface CuratedSite {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  active: boolean;
  weight: number;
  clickCount: number;
  addedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  siteConfig: SiteConfig;
}

export default function CuratedSitesAdmin({ siteConfig }: Props) {
  const [sites, setSites] = useState<CuratedSite[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSite, setEditingSite] = useState<CuratedSite | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tagFilter, setTagFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    tags: '',
    weight: 1,
    active: true
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/admin/curated-sites');
      if (response.ok) {
        const data = await response.json();
        setSites(data.sites);
        setAllTags(data.tags);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    if (!confirm('This will add the default curated sites to the database. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/curated-sites?seed=true');
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchSites();
      }
    } catch (error) {
      console.error('Failed to seed database:', error);
      alert('Failed to seed database');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const method = editingSite ? 'PUT' : 'POST';
    const body = editingSite
      ? { id: editingSite.id, ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) }
      : { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) };

    try {
      const response = await csrfFetch('/api/admin/curated-sites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchSites();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save site');
      }
    } catch (error) {
      console.error('Failed to save site:', error);
      alert('Failed to save site');
    }
  };

  const handleEdit = (site: CuratedSite) => {
    setEditingSite(site);
    setFormData({
      url: site.url,
      title: site.title,
      description: site.description,
      tags: site.tags.join(', '),
      weight: site.weight,
      active: site.active
    });
    setIsAddingNew(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this site?')) {
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/curated-sites?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSites();
      }
    } catch (error) {
      console.error('Failed to delete site:', error);
      alert('Failed to delete site');
    }
  };

  const toggleActive = async (site: CuratedSite) => {
    try {
      const response = await csrfFetch('/api/admin/curated-sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: site.id,
          active: !site.active
        })
      });

      if (response.ok) {
        fetchSites();
      }
    } catch (error) {
      console.error('Failed to toggle site status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      url: '',
      title: '',
      description: '',
      tags: '',
      weight: 1,
      active: true
    });
    setEditingSite(null);
    setIsAddingNew(false);
  };

  // Filter sites
  const filteredSites = sites.filter(site => {
    if (filter === 'active' && !site.active) return false;
    if (filter === 'inactive' && site.active) return false;
    if (tagFilter && !site.tags.includes(tagFilter)) return false;
    return true;
  });

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎲 Curated Sites Manager</h1>
          <p className="text-gray-600">
            Manage the curated sites for the &quot;Surprise Me&quot; discovery feature
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
            <div className="text-2xl font-bold">{sites.length}</div>
            <div className="text-gray-600">Total Sites</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-300 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {sites.filter(s => s.active).length}
            </div>
            <div className="text-gray-600">Active Sites</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-300 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{allTags.length}</div>
            <div className="text-gray-600">Unique Tags</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-300 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {sites.reduce((sum, s) => sum + s.clickCount, 0)}
            </div>
            <div className="text-gray-600">Total Clicks</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 items-center">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Sites</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {sites.length === 0 && (
              <button
                onClick={seedDatabase}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                🌱 Seed Default Sites
              </button>
            )}
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              ➕ Add New Site
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {isAddingNew && (
          <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingSite ? 'Edit Site' : 'Add New Site'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Site Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="What makes this site interesting?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="indie, blog, creative"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    Weight (1-10, higher = more likely)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  {editingSite ? '💾 Update' : '➕ Add'} Site
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sites List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sites found. {sites.length === 0 && 'Click "Seed Default Sites" to get started.'}
            </div>
          ) : (
            filteredSites.map(site => (
              <div
                key={site.id}
                className={`bg-white p-4 rounded-lg border shadow-sm ${
                  site.active ? 'border-gray-300' : 'border-red-300 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{site.title}</h3>
                      {!site.active && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                          Inactive
                        </span>
                      )}
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Weight: {site.weight}
                      </span>
                      {site.clickCount > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                          {site.clickCount} clicks
                        </span>
                      )}
                    </div>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {site.url}
                    </a>
                    <p className="text-gray-600 mt-1">{site.description}</p>
                    <div className="flex gap-1 mt-2">
                      {site.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleActive(site)}
                      className={`px-3 py-1 rounded ${
                        site.active
                          ? 'bg-gray-200 hover:bg-gray-300'
                          : 'bg-green-100 hover:bg-green-200'
                      }`}
                      title={site.active ? 'Deactivate' : 'Activate'}
                    >
                      {site.active ? '🚫' : '✅'}
                    </button>
                    <button
                      onClick={() => handleEdit(site)}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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