import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';
import ButtonLink from '@/components/ui/ButtonLink';
import Modal from '@/components/ui/feedback/Modal';
import Layout from '@/components/ui/layout/Layout';
import AdminHeader from '@/components/ui/navigation/AdminHeader';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import CurrentCollectionPanel from '@/components/features/admin/CurrentCollectionPanel';

interface Decoration {
  id: string;
  itemId: string;
  name: string;
  type: string;
  category: string;
  zone: string;
  section: string | null;
  isActive: boolean;
  releaseType: string;
  claimCount: number;
  releaseStartAt: string | null;
  releaseEndAt: string | null;
  claimCode: string | null;
  createdBy: string | null;
  pngUrl: string | null;
  description: string | null;
  gridWidth: number;
  gridHeight: number;
  _count: {
    userClaims: number;
  };
}

interface DecorationForm {
  itemId: string;
  name: string;
  type: string;
  category: string;
  zone: string;
  section: string;
  iconSvg: string;
  renderSvg: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  releaseType: string;
  isActive: boolean;
}

interface AdminDecorationsPageProps {
  isAdmin: boolean;
  userId: string | null;
}

export default function AdminDecorationsPage({ isAdmin, userId }: AdminDecorationsPageProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDecoration, setEditingDecoration] = useState<Decoration | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [uploadingPng, setUploadingPng] = useState<string | null>(null); // itemId being uploaded

  const defaultForm: DecorationForm = {
    itemId: '',
    name: '',
    type: 'plant',
    category: 'plants',
    zone: 'front_yard',
    section: '',
    iconSvg: '',
    renderSvg: '',
    description: '',
    gridWidth: 1,
    gridHeight: 1,
    releaseType: 'DEFAULT',
    isActive: true
  };

  const [createForm, setCreateForm] = useState<DecorationForm>(defaultForm);
  const [editForm, setEditForm] = useState<DecorationForm>(defaultForm);

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
      const response = await csrfFetch('/api/admin/decorations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setCreateForm(defaultForm);
        fetchDecorations();
      }
    } catch (error) {
      console.error('Failed to create decoration:', error);
    }
  };

  const handleStartEdit = (decoration: Decoration) => {
    setEditingDecoration(decoration);
    setEditForm({
      itemId: decoration.itemId,
      name: decoration.name,
      type: decoration.type,
      category: decoration.category,
      zone: decoration.zone,
      section: decoration.section || '',
      iconSvg: '', // Don't load SVG - too large
      renderSvg: '',
      description: decoration.description || '',
      gridWidth: decoration.gridWidth,
      gridHeight: decoration.gridHeight,
      releaseType: decoration.releaseType,
      isActive: decoration.isActive
    });
  };

  const handleEditDecoration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDecoration) return;

    try {
      const response = await csrfFetch(`/api/admin/decorations/${editingDecoration.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        setEditingDecoration(null);
        setEditForm(defaultForm);
        fetchDecorations();
      } else {
        const data = await response.json();
        showError(`Update failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to update decoration:', error);
    }
  };

  const handleDeleteDecoration = async (id: string) => {
    if (!(await confirm({ title: 'Delete this decoration?', confirmText: 'Delete', variant: 'danger' }))) return;

    try {
      const response = await csrfFetch(`/api/admin/decorations/${id}`, {
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
      const response = await csrfFetch('/api/admin/decorations/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true }) // Skip existing items, add new ones
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(`Migration complete. Created: ${data.results?.created ?? 0}, Skipped: ${data.results?.skipped ?? 0}`);
        fetchDecorations();
      } else {
        showError(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      showError("The migration didn't finish. The browser console has the details.");
    } finally {
      setMigrating(false);
    }
  };

  const handleGenerateClaimCode = async (id: string) => {
    const maxClaims = prompt('Enter max claims (leave empty for unlimited):');

    try {
      const response = await csrfFetch(`/api/admin/decorations/${id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // What the release route takes: it answered this button's old
        // { maxClaims } with a 400, and never sent the claimCode it read
        body: JSON.stringify({
          releaseType: 'CLAIM_CODE',
          generateCode: true,
          maxClaims: maxClaims ? parseInt(maxClaims) : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(`Claim link: ${data.claimUrl}`);
        fetchDecorations();
      } else {
        showError(data.error || "Couldn't make a claim code. Try again.");
      }
    } catch (error) {
      console.error('Failed to generate claim code:', error);
      showError("Couldn't make a claim code. Try again.");
    }
  };

  const handleGrantAccess = async (decorationId: string) => {
    const userId = prompt('Enter user ID to grant access:');
    if (!userId) return;

    try {
      const response = await csrfFetch(`/api/admin/decorations/${decorationId}/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // The grant route takes a list (it answered { userId } with a 400)
        body: JSON.stringify({ userIds: [userId.trim()] })
      });

      if (response.ok) {
        showSuccess('Access granted.');
        fetchDecorations();
      } else {
        const data = await response.json().catch(() => ({}));
        showError(data.error || "Couldn't grant access. Try again.");
      }
    } catch (error) {
      console.error('Failed to grant access:', error);
      showError("Couldn't grant access. Try again.");
    }
  };

  const handlePngUpload = async (itemId: string, file: File) => {
    setUploadingPng(itemId);

    try {
      // Read file as data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await csrfFetch('/api/admin/decorations/upload-png', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId,
          imageData: dataUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(`PNG uploaded (${data.dimensions.width}x${data.dimensions.height}): ${data.pngUrl}`);
        fetchDecorations();
      } else {
        showError(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('PNG upload failed:', error);
      showError("Couldn't upload the PNG. The browser console has the details.");
    } finally {
      setUploadingPng(null);
    }
  };

  const triggerPngUpload = (itemId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePngUpload(itemId, file);
      }
    };
    input.click();
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
    return <Layout><div className="p-8">This page needs admin access.</div></Layout>;
  }

  if (loading) {
    return <Layout><div className="p-8">Loading…</div></Layout>;
  }

  return (
    <Layout fullWidth>
    <div className="p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminHeader current="decorations">
          <p>Manage decorations, create releases, and generate claim codes.</p>
        </AdminHeader>

        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="/admin/decorations/from-png">New from PNG</ButtonLink>
            <ButtonLink href="/admin/decorations/sheet" variant="secondary">Contact sheet</ButtonLink>
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
              {migrating ? <><PixelIcon name="clock" /> Migrating...</> : <><PixelIcon name="reload" /> Migrate BETA_ITEMS</>}
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

        <CurrentCollectionPanel />

        {/* Create Form Modal */}
        {showCreateForm && (
          <Modal
            isOpen
            onClose={() => setShowCreateForm(false)}
            title="Create New Decoration"
            closeOnBackdrop={false}
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="create-decoration-form"
                  className="btn btn--primary"
                >
                  Create Decoration
                </button>
              </div>
            }
          >
            <form id="create-decoration-form" onSubmit={handleCreateDecoration}>
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
            </form>
          </Modal>
        )}

        {/* Edit Form Modal */}
        {editingDecoration && (
          <Modal
            isOpen
            onClose={() => setEditingDecoration(null)}
            title={`Edit Decoration: ${editingDecoration.itemId}`}
            closeOnBackdrop={false}
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDecoration(null)}
                  className="btn btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-decoration-form"
                  className="btn btn--primary"
                >
                  Save Changes
                </button>
              </div>
            }
          >
            <form id="edit-decoration-form" onSubmit={handleEditDecoration}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item ID (readonly)</label>
                  <input
                    type="text"
                    value={editForm.itemId}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="plant">Plant</option>
                    <option value="furniture">Furniture</option>
                    <option value="path">Path</option>
                    <option value="feature">Feature</option>
                    <option value="lighting">Lighting</option>
                    <option value="water">Water</option>
                    <option value="structure">Structure</option>
                    <option value="house_custom">House Custom</option>
                    <option value="sky">Sky/Atmosphere</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Zone</label>
                  <select
                    value={editForm.zone}
                    onChange={(e) => setEditForm({...editForm, zone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="front_yard">Front Yard</option>
                    <option value="house_facade">House Facade</option>
                    <option value="background">Background</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Section (for house items)</label>
                  <select
                    value={editForm.section}
                    onChange={(e) => setEditForm({...editForm, section: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">None</option>
                    <option value="doors">Doors</option>
                    <option value="windows">Windows</option>
                    <option value="window_treatments">Window Treatments</option>
                    <option value="roof">Roof/Trim</option>
                    <option value="chimney">Chimney</option>
                    <option value="welcome_mat">Welcome Mat</option>
                    <option value="house_number">House Number</option>
                    <option value="exterior_lights">Exterior Lights</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Release Type</label>
                  <select
                    value={editForm.releaseType}
                    onChange={(e) => setEditForm({...editForm, releaseType: e.target.value})}
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
                    value={editForm.gridWidth}
                    onChange={(e) => setEditForm({...editForm, gridWidth: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Grid Height</label>
                  <input
                    type="number"
                    value={editForm.gridHeight}
                    onChange={(e) => setEditForm({...editForm, gridHeight: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Active</label>
                  <select
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={(e) => setEditForm({...editForm, isActive: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
            </form>
          </Modal>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNG</th>
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
                    {decoration.pngUrl ? (
                      <a
                        href={decoration.pngUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline inline-flex items-center gap-1"
                        title={decoration.pngUrl}
                      >
                        <PixelIcon name="check" size={12} className="shrink-0" />Has PNG
                      </a>
                    ) : (
                      <span className="text-gray-400">No PNG</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {decoration._count.userClaims} users
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {decoration.isActive ? (
                      <span className="text-green-600 inline-flex items-center gap-1"><PixelIcon name="check" size={12} className="shrink-0" />Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStartEdit(decoration)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => triggerPngUpload(decoration.itemId)}
                        disabled={uploadingPng === decoration.itemId}
                        className="text-indigo-600 hover:underline disabled:opacity-50"
                      >
                        {uploadingPng === decoration.itemId ? 'Uploading...' : 'PNG'}
                      </button>
                      {decoration.releaseType === 'CLAIM_CODE' && !decoration.claimCode && (
                        <button
                          onClick={() => handleGenerateClaimCode(decoration.id)}
                          className="text-purple-600 hover:underline"
                        >
                          Code
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
    </Layout>
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