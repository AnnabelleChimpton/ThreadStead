import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getSessionUser } from '@/lib/auth/server';

interface Decoration {
  id: string;
  itemId: string;
  name: string;
  type: string;
  category: string;
  zone: string;
  isActive: boolean;
  releaseType: string;
  claimCount: number;
  releaseStartAt: string | null;
  releaseEndAt: string | null;
  claimCode: string | null;
  createdBy: string | null;
  _count: {
    userClaims: number;
  };
}

interface CreateDecorationForm {
  itemId: string;
  name: string;
  type: string;
  category: string;
  zone: string;
  iconSvg: string;
  renderSvg: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  releaseType: string;
}

interface AdminDecorationsPageProps {
  isAdmin: boolean;
  userId: string | null;
}

export default function AdminDecorationsPage({ isAdmin, userId }: AdminDecorationsPageProps) {
  const router = useRouter();

  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [migrating, setMigrating] = useState(false);

  const [createForm, setCreateForm] = useState<CreateDecorationForm>({
    itemId: '',
    name: '',
    type: 'plant',
    category: 'plants',
    zone: 'front_yard',
    iconSvg: '',
    renderSvg: '',
    description: '',
    gridWidth: 1,
    gridHeight: 1,
    releaseType: 'DEFAULT'
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchDecorations();
  }, [isAdmin]);

  const fetchDecorations = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterType) params.append('releaseType', filterType);

      const response = await fetch(`/api/admin/decorations?${params}`);
      const data = await response.json();

      if (response.ok) {
        setDecorations(data.decorations);
      }
    } catch (error) {
      console.error('Failed to fetch decorations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDecoration = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/decorations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setCreateForm({
          itemId: '',
          name: '',
          type: 'plant',
          category: 'plants',
          zone: 'front_yard',
          iconSvg: '',
          renderSvg: '',
          description: '',
          gridWidth: 1,
          gridHeight: 1,
          releaseType: 'DEFAULT'
        });
        fetchDecorations();
      }
    } catch (error) {
      console.error('Failed to create decoration:', error);
    }
  };

  const handleDeleteDecoration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this decoration?')) return;

    try {
      const response = await fetch(`/api/admin/decorations/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchDecorations();
      }
    } catch (error) {
      console.error('Failed to delete decoration:', error);
    }
  };

  const handleMigrateBetaItems = async () => {
    setMigrating(true);
    try {
      const response = await fetch('/api/admin/decorations/migrate', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Migration complete! Created: ${data.created}, Skipped: ${data.skipped}`);
        fetchDecorations();
      } else {
        alert(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed - check console');
    } finally {
      setMigrating(false);
    }
  };

  const handleGenerateClaimCode = async (id: string) => {
    const maxClaims = prompt('Enter max claims (leave empty for unlimited):');

    try {
      const response = await fetch(`/api/admin/decorations/${id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxClaims: maxClaims ? parseInt(maxClaims) : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Claim code generated: ${data.claimCode}\nShare URL: ${window.location.origin}/claim/${data.claimCode}`);
        fetchDecorations();
      }
    } catch (error) {
      console.error('Failed to generate claim code:', error);
    }
  };

  const handleGrantAccess = async (decorationId: string) => {
    const userId = prompt('Enter user ID to grant access:');
    if (!userId) return;

    try {
      const response = await fetch(`/api/admin/decorations/${decorationId}/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        alert('Access granted successfully');
        fetchDecorations();
      }
    } catch (error) {
      console.error('Failed to grant access:', error);
    }
  };

  const generateBasicSvgIcon = () => {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="18" height="18" rx="2" fill="#4FAF6D" opacity="0.8"/>
  <text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">
    ${createForm.type.charAt(0).toUpperCase()}
  </text>
</svg>`;
  };

  const generateBasicSvgRender = () => {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="16" fill="#4FAF6D" opacity="0.9"/>
  <text x="20" y="26" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
    ${createForm.itemId.split('_')[0].charAt(0).toUpperCase()}
  </text>
</svg>`;
  };

  useEffect(() => {
    fetchDecorations();
  }, [searchQuery, filterType]);

  if (!isAdmin) {
    return <div className="p-8">Unauthorized - Admin access required</div>;
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎨 Decoration Management System
          </h1>
          <p className="text-gray-600">
            Manage decorations, create releases, and generate claim codes
          </p>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ➕ Create Decoration
            </button>

            <button
              onClick={handleMigrateBetaItems}
              disabled={migrating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {migrating ? '⏳ Migrating...' : '🔄 Migrate BETA_ITEMS'}
            </button>

            <input
              type="text"
              placeholder="Search decorations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Types</option>
              <option value="DEFAULT">Default</option>
              <option value="PUBLIC">Public</option>
              <option value="BETA_USERS">Beta Users</option>
              <option value="LIMITED_TIME">Limited Time</option>
              <option value="CLAIM_CODE">Claim Code</option>
              <option value="ADMIN_ONLY">Admin Only</option>
            </select>
          </div>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Create New Decoration</h2>

              <form onSubmit={handleCreateDecoration}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Item ID</label>
                    <input
                      type="text"
                      value={createForm.itemId}
                      onChange={(e) => setCreateForm({...createForm, itemId: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="roses_red"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Red Roses"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm({...createForm, type: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="plant">Plant</option>
                      <option value="furniture">Furniture</option>
                      <option value="path">Path</option>
                      <option value="feature">Feature</option>
                      <option value="lighting">Lighting</option>
                      <option value="water">Water</option>
                      <option value="structure">Structure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input
                      type="text"
                      value={createForm.category}
                      onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="plants"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Zone</label>
                    <select
                      value={createForm.zone}
                      onChange={(e) => setCreateForm({...createForm, zone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="front_yard">Front Yard</option>
                      <option value="house_facade">House Facade</option>
                      <option value="background">Background</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Release Type</label>
                    <select
                      value={createForm.releaseType}
                      onChange={(e) => setCreateForm({...createForm, releaseType: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="DEFAULT">Default (Always Available)</option>
                      <option value="PUBLIC">Public</option>
                      <option value="BETA_USERS">Beta Users</option>
                      <option value="LIMITED_TIME">Limited Time</option>
                      <option value="CLAIM_CODE">Claim Code</option>
                      <option value="ADMIN_ONLY">Admin Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Grid Width</label>
                    <input
                      type="number"
                      value={createForm.gridWidth}
                      onChange={(e) => setCreateForm({...createForm, gridWidth: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                      max="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Grid Height</label>
                    <input
                      type="number"
                      value={createForm.gridHeight}
                      onChange={(e) => setCreateForm({...createForm, gridHeight: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Icon SVG</label>
                  <div className="flex gap-2">
                    <textarea
                      value={createForm.iconSvg}
                      onChange={(e) => setCreateForm({...createForm, iconSvg: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded-lg font-mono text-xs"
                      rows={3}
                      placeholder="<svg>...</svg>"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateForm({...createForm, iconSvg: generateBasicSvgIcon()})}
                      className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Render SVG</label>
                  <div className="flex gap-2">
                    <textarea
                      value={createForm.renderSvg}
                      onChange={(e) => setCreateForm({...createForm, renderSvg: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded-lg font-mono text-xs"
                      rows={3}
                      placeholder="<svg>...</svg>"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateForm({...createForm, renderSvg: generateBasicSvgRender()})}
                      className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Decoration
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Decorations Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Release</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claims</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {decorations.map((decoration) => (
                <tr key={decoration.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{decoration.itemId}</td>
                  <td className="px-4 py-3 text-sm font-medium">{decoration.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                      {decoration.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${
                      decoration.releaseType === 'DEFAULT' ? 'bg-yellow-100 text-yellow-800 font-semibold' :
                      decoration.releaseType === 'PUBLIC' ? 'bg-green-100 text-green-800' :
                      decoration.releaseType === 'BETA_USERS' ? 'bg-blue-100 text-blue-800' :
                      decoration.releaseType === 'LIMITED_TIME' ? 'bg-orange-100 text-orange-800' :
                      decoration.releaseType === 'CLAIM_CODE' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {decoration.releaseType === 'DEFAULT' ? '⭐ DEFAULT' : decoration.releaseType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {decoration._count.userClaims} users
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {decoration.isActive ? (
                      <span className="text-green-600">✓ Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      {decoration.releaseType === 'CLAIM_CODE' && !decoration.claimCode && (
                        <button
                          onClick={() => handleGenerateClaimCode(decoration.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Generate Code
                        </button>
                      )}
                      {decoration.claimCode && (
                        <span className="text-xs bg-purple-100 px-2 py-1 rounded">
                          {decoration.claimCode}
                        </span>
                      )}
                      <button
                        onClick={() => handleGrantAccess(decoration.id)}
                        className="text-green-600 hover:underline"
                      >
                        Grant
                      </button>
                      <button
                        onClick={() => handleDeleteDecoration(decoration.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      isAdmin: user?.role === 'admin' || false,
      userId: user?.id || null
    }
  };
};