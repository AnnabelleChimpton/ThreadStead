import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import RetroCard from '@/components/layout/RetroCard';
import ThreadRing88x31Badge from '@/components/ThreadRing88x31Badge';
import { getSessionUser } from '@/lib/auth-server';
import { featureFlags } from '@/lib/feature-flags';
import { getRingHubClient } from '@/lib/ringhub-client';
import { db } from '@/lib/db';
import { BADGE_TEMPLATES, type BadgeTemplate } from '@/lib/threadring-badges';

interface BadgeManagerPageProps {
  ring: {
    id: string;
    slug: string;
    name: string;
    description: string;
    visibility: string;
  };
  user: {
    id: string;
    primaryHandle: string;
  };
  canManage: boolean;
}

interface BadgeDesign {
  badgeImageUrl?: string;
  badgeImageHighResUrl?: string;
  description?: string;
  criteria?: string;
}

interface LocalBadgeData {
  id?: string;
  title: string;
  subtitle?: string;
  templateId?: string;
  backgroundColor: string;
  textColor: string;
  imageUrl?: string;
  isGenerated: boolean;
  isActive: boolean;
}

export default function BadgeManagerPage({ ring, user, canManage }: BadgeManagerPageProps) {
  const router = useRouter();
  const [currentBadge, setCurrentBadge] = useState<BadgeDesign | null>(null);
  const [editedBadge, setEditedBadge] = useState<BadgeDesign>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Local badge template state
  const [currentLocalBadge, setCurrentLocalBadge] = useState<LocalBadgeData | null>(null);
  const [editedLocalBadge, setEditedLocalBadge] = useState<Partial<LocalBadgeData>>({});
  const [templates] = useState<BadgeTemplate[]>(BADGE_TEMPLATES);
  const [isLocalEditing, setIsLocalEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'template' | 'custom' | 'upload'>('template');

  // Access control based on server-side permission check
  const canManageBadge = canManage;

  useEffect(() => {
    if (canManageBadge) {
      loadCurrentBadge();
      loadLocalBadge();
    }
  }, [ring.slug, canManageBadge]);

  const loadCurrentBadge = async () => {
    try {
      // For now, we'll start with empty badge data since we're transitioning to RingHub
      // In the future, we could fetch current badge info from RingHub if available
      setCurrentBadge({
        description: `Badge for ${ring.name} ThreadRing`,
        criteria: 'Active participation in the ThreadRing community'
      });
      setEditedBadge({
        description: `Badge for ${ring.name} ThreadRing`,
        criteria: 'Active participation in the ThreadRing community'
      });
    } catch (error) {
      console.error('Failed to load current badge:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare the badge update data
      const updateData: any = {};
      
      if (editedBadge.badgeImageUrl?.trim()) {
        updateData.badgeImageUrl = editedBadge.badgeImageUrl.trim();
      }
      
      if (editedBadge.badgeImageHighResUrl?.trim()) {
        updateData.badgeImageHighResUrl = editedBadge.badgeImageHighResUrl.trim();
      }
      
      if (editedBadge.description?.trim()) {
        updateData.description = editedBadge.description.trim();
      }
      
      if (editedBadge.criteria?.trim()) {
        updateData.criteria = editedBadge.criteria.trim();
      }

      // Always regenerate existing badges when updating
      updateData.updateExistingBadges = true;

      const response = await fetch(`/api/threadrings/${ring.slug}/update-badge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentBadge(editedBadge);
        setIsEditing(false);
        setSuccess(`${result.message}${result.badgesUpdated ? ` (${result.badgesUpdated} existing badges updated)` : ''}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update badge');
      }
    } catch (error) {
      setError('Network error occurred while updating badge');
    } finally {
      setIsLoading(false);
    }
  };

  // Local badge management functions
  const loadLocalBadge = async () => {
    try {
      const response = await fetch(`/api/threadrings/${ring.slug}/badge`);
      if (response.ok) {
        const data = await response.json();
        setCurrentLocalBadge(data.badge);
        setEditedLocalBadge(data.badge || {});
      }
    } catch (error) {
      console.error('Failed to load local badge:', error);
    }
  };

  const handleLocalSave = async () => {
    setLocalLoading(true);
    setError(null);

    try {
      const badgeData: any = {
        title: editedLocalBadge.title || ring.name,
        subtitle: editedLocalBadge.subtitle,
        isActive: true
      };

      if (editedLocalBadge.templateId) {
        badgeData.templateId = editedLocalBadge.templateId;
      } else if (editedLocalBadge.backgroundColor || editedLocalBadge.textColor) {
        badgeData.backgroundColor = editedLocalBadge.backgroundColor;
        badgeData.textColor = editedLocalBadge.textColor;
      }
      
      if (editedLocalBadge.imageUrl) {
        badgeData.imageUrl = editedLocalBadge.imageUrl;
      }

      const response = await fetch(`/api/threadrings/${ring.slug}/badge`, {
        method: currentLocalBadge?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(badgeData),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentLocalBadge(data.badge);
        setEditedLocalBadge(data.badge);
        setIsLocalEditing(false);
        setSuccess('Local badge template updated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save local badge');
      }
    } catch (error) {
      setError('Network error occurred while saving local badge');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLocalDelete = async () => {
    if (!currentLocalBadge?.id || !confirm('Are you sure you want to delete this local badge template?')) {
      return;
    }

    setLocalLoading(true);
    try {
      const response = await fetch(`/api/threadrings/${ring.slug}/badge`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCurrentLocalBadge(null);
        setEditedLocalBadge({});
        setIsLocalEditing(false);
        setSuccess('Local badge template deleted successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete local badge');
      }
    } catch (error) {
      setError('Network error occurred while deleting local badge');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditedLocalBadge({
        ...editedLocalBadge,
        templateId: template.id,
        backgroundColor: undefined,
        textColor: undefined,
        imageUrl: undefined
      });
      setPreviewMode('template');
    }
  };

  const getPreviewBadge = () => {
    const badge: any = {
      title: editedLocalBadge.title || ring.name,
      subtitle: editedLocalBadge.subtitle,
      imageUrl: editedLocalBadge.imageUrl,
      isGenerated: false,
      isActive: true
    };

    if (editedLocalBadge.templateId) {
      badge.templateId = editedLocalBadge.templateId;
    } else {
      badge.backgroundColor = editedLocalBadge.backgroundColor || '#4A90E2';
      badge.textColor = editedLocalBadge.textColor || '#FFFFFF';
    }

    return badge;
  };

  if (!canManageBadge) {
    return (
      <>
        <Head>
          <title>Access Denied - Badge Manager | ThreadStead</title>
        </Head>
        <Layout>
          <RetroCard>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚫</div>
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-6">
                Only ThreadRing owners and curators can manage badge designs.
              </p>
              <button
                onClick={() => router.push(`/tr/${ring.slug}`)}
                className="px-6 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
              >
                ← Back to ThreadRing
              </button>
            </div>
          </RetroCard>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Badge Manager - {ring.name} | ThreadStead</title>
      </Head>
      <Layout>
        <RetroCard>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">🏆 Badge Manager</h1>
                <p className="text-gray-600">
                  Manage the badge design for <strong>{ring.name}</strong> ThreadRing
                </p>
              </div>
              <button
                onClick={() => router.push(`/tr/${ring.slug}/settings`)}
                className="px-4 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
              >
                ← Back to Settings
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-700">
              <strong>Success:</strong> {success}
            </div>
          )}

          <div className="bg-white border border-black rounded-none shadow-[3px_3px_0_#000]">
            {/* Header */}
            <div className="border-b border-black p-6 bg-yellow-50">
              <h3 className="text-xl font-bold text-black mb-2">ThreadRing Badge Design</h3>
              <p className="text-gray-700">
                Update the badge that members of this ThreadRing will receive. Changes will regenerate all existing member badges.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Badge Preview */}
              <div>
                <h4 className="font-bold text-lg mb-3">Current Badge Preview</h4>
                <div className="flex items-center gap-4">
                  <ThreadRing88x31Badge
                    title={ring.name}
                    subtitle="member"
                    imageUrl={currentBadge?.badgeImageUrl}
                    backgroundColor="#4A90E2"
                    textColor="#FFFFFF"
                  />
                  <div className="text-sm text-gray-600">
                    <p><strong>ThreadRing:</strong> {ring.name}</p>
                    <p><strong>Badge Type:</strong> Member Badge</p>
                    {currentBadge?.description && <p><strong>Description:</strong> {currentBadge.description}</p>}
                  </div>
                </div>
              </div>

              {/* Badge Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg">Badge Configuration</h4>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                    >
                      ✏️ Edit Badge Design
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-gray-800 mb-1">Badge Image URL:</label>
                      <p className="text-gray-600">{currentBadge?.badgeImageUrl || 'Not set (using default design)'}</p>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-800 mb-1">High-Resolution Image URL:</label>
                      <p className="text-gray-600">{currentBadge?.badgeImageHighResUrl || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-800 mb-1">Description:</label>
                      <p className="text-gray-600">{currentBadge?.description || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-800 mb-1">Criteria:</label>
                      <p className="text-gray-600">{currentBadge?.criteria || 'Not set'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-gray-800 mb-2">Badge Image URL (HTTPS required):</label>
                      <input
                        type="url"
                        placeholder="https://example.com/badge.png"
                        value={editedBadge.badgeImageUrl || ''}
                        onChange={(e) => setEditedBadge({ ...editedBadge, badgeImageUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Upload your badge image to a hosting service and paste the HTTPS URL here. Recommended size: 88x31 pixels.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-800 mb-2">High-Resolution Image URL (optional):</label>
                      <input
                        type="url"
                        placeholder="https://example.com/badge-2x.png"
                        value={editedBadge.badgeImageHighResUrl || ''}
                        onChange={(e) => setEditedBadge({ ...editedBadge, badgeImageHighResUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Higher resolution version for retina displays. Recommended size: 176x62 pixels.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-800 mb-2">Badge Description:</label>
                      <textarea
                        placeholder="Description of what this badge represents"
                        value={editedBadge.description || ''}
                        onChange={(e) => setEditedBadge({ ...editedBadge, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-800 mb-2">Badge Criteria:</label>
                      <textarea
                        placeholder="What does someone need to do to earn this badge?"
                        value={editedBadge.criteria || ''}
                        onChange={(e) => setEditedBadge({ ...editedBadge, criteria: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2 border border-black bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_#000]"
                      >
                        {isLoading ? '💾 Updating...' : '💾 Update Badge Design'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedBadge(currentBadge || {});
                          setError(null);
                        }}
                        className="px-4 py-2 border border-black bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h5 className="font-bold text-blue-900 mb-2">🔄 Badge Regeneration</h5>
                  <p className="text-sm text-blue-800">
                    When you update the badge design, all existing member badges will be automatically regenerated with the new design. 
                    This ensures all members have the latest badge artwork.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Local Badge Template Generator */}
          <div className="mt-8">
            <div className="bg-white border border-black rounded-none shadow-[3px_3px_0_#000]">
              {/* Header */}
              <div className="border-b border-black p-6 bg-green-50">
                <h3 className="text-xl font-bold text-black mb-2">🎨 Local Badge Template Generator</h3>
                <p className="text-gray-700">
                  Create a local badge template with pre-designed templates, custom colors, or uploaded images. 
                  This is separate from the RingHub badge system above.
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Current Local Badge Display */}
                {currentLocalBadge && !isLocalEditing && (
                  <div>
                    <h4 className="font-bold text-lg mb-3">Current Local Badge Template</h4>
                    <div className="flex items-center gap-4">
                      <ThreadRing88x31Badge
                        templateId={currentLocalBadge.templateId}
                        title={currentLocalBadge.title}
                        subtitle={currentLocalBadge.subtitle}
                        backgroundColor={currentLocalBadge.backgroundColor}
                        textColor={currentLocalBadge.textColor}
                        imageUrl={currentLocalBadge.imageUrl}
                      />
                      <div className="text-sm text-gray-600">
                        <p><strong>Title:</strong> {currentLocalBadge.title}</p>
                        {currentLocalBadge.subtitle && <p><strong>Subtitle:</strong> {currentLocalBadge.subtitle}</p>}
                        <p><strong>Template:</strong> {currentLocalBadge.templateId || 'Custom'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setIsLocalEditing(true)}
                        className="px-4 py-2 border border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                      >
                        ✏️ Edit Template
                      </button>
                      <button
                        onClick={handleLocalDelete}
                        disabled={localLoading}
                        className="px-4 py-2 border border-black bg-red-100 hover:bg-red-200 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
                      >
                        🗑️ Delete Template
                      </button>
                    </div>
                  </div>
                )}

                {/* Badge Template Editor */}
                {(!currentLocalBadge || isLocalEditing) && (
                  <div className="space-y-6">
                    {/* Preview */}
                    <div>
                      <h4 className="font-bold text-lg mb-3">Template Preview</h4>
                      <ThreadRing88x31Badge {...getPreviewBadge()} />
                    </div>

                    {/* Mode Selection */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewMode('template')}
                        className={`px-4 py-2 border border-black font-medium shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] ${
                          previewMode === 'template' 
                            ? 'bg-yellow-200' 
                            : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        📄 Use Template
                      </button>
                      <button
                        onClick={() => setPreviewMode('custom')}
                        className={`px-4 py-2 border border-black font-medium shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] ${
                          previewMode === 'custom' 
                            ? 'bg-yellow-200' 
                            : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        🎨 Custom Colors
                      </button>
                      <button
                        onClick={() => setPreviewMode('upload')}
                        className={`px-4 py-2 border border-black font-medium shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] ${
                          previewMode === 'upload' 
                            ? 'bg-yellow-200' 
                            : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        🖼️ Upload Image
                      </button>
                    </div>

                    {/* Template Selection */}
                    {previewMode === 'template' && (
                      <div>
                        <label className="block font-bold text-gray-800 mb-3">Choose Template:</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {templates.map((template) => (
                            <div
                              key={template.id}
                              onClick={() => handleTemplateSelect(template.id)}
                              className={`p-3 border border-black rounded-none cursor-pointer text-center shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] ${
                                editedLocalBadge.templateId === template.id
                                  ? 'bg-yellow-100'
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <ThreadRing88x31Badge
                                templateId={template.id}
                                title={editedLocalBadge.title || ring.name}
                                subtitle={editedLocalBadge.subtitle}
                              />
                              <p className="text-xs mt-2 font-medium">{template.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Colors */}
                    {previewMode === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-gray-800 mb-2">Background Color:</label>
                          <input
                            type="color"
                            value={editedLocalBadge.backgroundColor || '#4A90E2'}
                            onChange={(e) => setEditedLocalBadge({
                              ...editedLocalBadge,
                              backgroundColor: e.target.value,
                              templateId: undefined
                            })}
                            className="w-full h-12 border border-black rounded-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-800 mb-2">Text Color:</label>
                          <input
                            type="color"
                            value={editedLocalBadge.textColor || '#FFFFFF'}
                            onChange={(e) => setEditedLocalBadge({
                              ...editedLocalBadge,
                              textColor: e.target.value,
                              templateId: undefined
                            })}
                            className="w-full h-12 border border-black rounded-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Image Upload */}
                    {previewMode === 'upload' && (
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Custom Badge Image (88x31 pixels):</label>
                        <input
                          type="url"
                          placeholder="https://example.com/badge.png"
                          value={editedLocalBadge.imageUrl || ''}
                          onChange={(e) => setEditedLocalBadge({
                            ...editedLocalBadge,
                            imageUrl: e.target.value,
                            templateId: undefined
                          })}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-600 mt-2">
                          Upload your image to a hosting service and paste the URL here. Recommended size: 88x31 pixels.
                        </p>
                      </div>
                    )}

                    {/* Text Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Title:</label>
                        <input
                          type="text"
                          placeholder={ring.name}
                          maxLength={15}
                          value={editedLocalBadge.title || ''}
                          onChange={(e) => setEditedLocalBadge({
                            ...editedLocalBadge,
                            title: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-600 mt-1">Max 15 characters</p>
                      </div>
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Subtitle (optional):</label>
                        <input
                          type="text"
                          placeholder="@threadring"
                          maxLength={12}
                          value={editedLocalBadge.subtitle || ''}
                          onChange={(e) => setEditedLocalBadge({
                            ...editedLocalBadge,
                            subtitle: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-600 mt-1">Max 12 characters</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleLocalSave}
                        disabled={localLoading}
                        className="px-6 py-2 border border-black bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_#000]"
                      >
                        {localLoading ? '💾 Saving...' : '💾 Save Template'}
                      </button>
                      {isLocalEditing && (
                        <button
                          onClick={() => {
                            setIsLocalEditing(false);
                            setEditedLocalBadge(currentLocalBadge || {});
                            setError(null);
                          }}
                          className="px-4 py-2 border border-black bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Local Badge Information */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-amber-50 border border-amber-200 rounded p-4">
                    <h5 className="font-bold text-amber-900 mb-2">🎨 About Local Templates</h5>
                    <p className="text-sm text-amber-800">
                      Local badge templates are stored on ThreadStead and can be displayed on your ThreadRing page. 
                      These are separate from RingHub member badges and are used for visual decoration of your ThreadRing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BadgeManagerPageProps> = async (context) => {
  const { slug } = context.query;
  const user = await getSessionUser(context.req as any);

  if (!user) {
    return {
      redirect: {
        destination: '/identity',
        permanent: false,
      },
    };
  }

  if (!featureFlags.ringhub()) {
    return {
      notFound: true,
    };
  }

  if (typeof slug !== 'string') {
    return {
      notFound: true,
    };
  }

  try {
    // Try Ring Hub first if enabled
    if (featureFlags.ringhub()) {
      const ringHubClient = getRingHubClient();
      if (ringHubClient) {
        try {
          console.log('[Badge Manager SSR] Fetching ring from RingHub:', slug);
          const ring = await ringHubClient.getRing(slug);
          
          if (ring) {
            console.log('[Badge Manager SSR] Found RingHub ring:', ring.slug);
            
            // Check ownership via local database tracking (source of truth)
            let canManage = false;
            
            try {
              const ringHubOwnership = await db.ringHubOwnership.findUnique({
                where: { ringSlug: slug }
              });
              console.log('[Badge Manager SSR] Local ownership record:', ringHubOwnership);
              
              if (ringHubOwnership && ringHubOwnership.ownerUserId === user.id) {
                canManage = true;
                console.log('[Badge Manager SSR] User is owner via local ownership tracking');
              } else {
                console.log('[Badge Manager SSR] User is not owner of this ring');
              }
              
            } catch (ownershipError) {
              console.warn('[Badge Manager SSR] Error checking local ownership:', ownershipError);
            }
            
            return {
              props: {
                ring: {
                  id: ring.id,
                  slug: ring.slug,
                  name: ring.name,
                  description: ring.description || '',
                  visibility: ring.visibility,
                },
                user: {
                  id: user.id,
                  primaryHandle: user.primaryHandle || '',
                },
                canManage,
              },
            };
          }
        } catch (ringHubError) {
          console.error('[Badge Manager SSR] RingHub error:', ringHubError);
        }
      }
    }

    // If we get here, ring was not found
    return {
      notFound: true,
    };
  } catch (error) {
    console.error('[Badge Manager SSR] Error loading ring for badge manager:', error);
    return {
      notFound: true,
    };
  }
};