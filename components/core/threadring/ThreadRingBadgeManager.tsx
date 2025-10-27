import React, { useState, useEffect } from 'react';
import { BADGE_TEMPLATES, type BadgeTemplate } from '@/lib/domain/threadrings/badges';
import ThreadRing88x31Badge from './ThreadRing88x31Badge';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface ThreadRingBadgeManagerProps {
  threadRingSlug: string;
  threadRingName: string;
  onBadgeUpdate?: () => void;
}

interface BadgeData {
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

export default function ThreadRingBadgeManager({
  threadRingSlug,
  threadRingName,
  onBadgeUpdate
}: ThreadRingBadgeManagerProps) {
  const [currentBadge, setCurrentBadge] = useState<BadgeData | null>(null);
  const [editedBadge, setEditedBadge] = useState<Partial<BadgeData>>({});
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'template' | 'custom' | 'upload'>('template');

  // Load current badge and templates
  useEffect(() => {
    loadBadge();
    loadTemplates();
  }, [threadRingSlug]);

  const loadBadge = async () => {
    try {
      const response = await fetch(`/api/threadrings/${threadRingSlug}/badge`);
      if (response.ok) {
        const data = await response.json();
        setCurrentBadge(data.badge);
        setEditedBadge(data.badge || {});
      }
    } catch (error) {
      console.error('Failed to load badge:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/threadrings/badge-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare the data to send - only include relevant fields based on mode
      const badgeData: any = {
        title: editedBadge.title || threadRingName,
        subtitle: editedBadge.subtitle,
        isActive: true
      };

      // If using a template, only send the templateId
      if (editedBadge.templateId) {
        badgeData.templateId = editedBadge.templateId;
      } 
      // If using custom colors, send the colors
      else if (editedBadge.backgroundColor || editedBadge.textColor) {
        badgeData.backgroundColor = editedBadge.backgroundColor;
        badgeData.textColor = editedBadge.textColor;
      }
      
      // Include image URL if provided
      if (editedBadge.imageUrl) {
        badgeData.imageUrl = editedBadge.imageUrl;
      }

      const response = await csrfFetch(`/api/threadrings/${threadRingSlug}/badge`, {
        method: currentBadge?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(badgeData),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBadge(data.badge);
        setEditedBadge(data.badge);
        setIsEditing(false);
        onBadgeUpdate?.();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save badge');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentBadge?.id || !confirm('Are you sure you want to delete this badge?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await csrfFetch(`/api/threadrings/${threadRingSlug}/badge`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCurrentBadge(null);
        setEditedBadge({});
        setIsEditing(false);
        onBadgeUpdate?.();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete badge');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditedBadge({
        ...editedBadge,
        templateId: template.id,
        // Don't set backgroundColor/textColor - let template handle styling
        backgroundColor: undefined,
        textColor: undefined,
        imageUrl: undefined // Clear custom image when using template
      });
      setPreviewMode('template');
    }
  };

  const getPreviewBadge = () => {
    const badge: any = {
      title: editedBadge.title || threadRingName,
      subtitle: editedBadge.subtitle,
      imageUrl: editedBadge.imageUrl,
      isGenerated: false,
      isActive: true
    };

    // If using a template, only include templateId
    if (editedBadge.templateId) {
      badge.templateId = editedBadge.templateId;
    } 
    // Otherwise include custom colors
    else {
      badge.backgroundColor = editedBadge.backgroundColor || '#4A90E2';
      badge.textColor = editedBadge.textColor || '#FFFFFF';
    }

    return badge;
  };

  return (
    <div className="border border-black bg-white shadow-[2px_2px_0_#000] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">88x31 Webring Badge</h3>
        {currentBadge && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              disabled={isLoading}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Current Badge Display */}
      {currentBadge && !isEditing && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Current Badge:</p>
          <div className="flex items-center gap-4">
            <ThreadRing88x31Badge
              templateId={currentBadge.templateId}
              title={currentBadge.title}
              subtitle={currentBadge.subtitle}
              backgroundColor={currentBadge.backgroundColor}
              textColor={currentBadge.textColor}
              imageUrl={currentBadge.imageUrl}
            />
            <div className="text-sm text-gray-600">
              <p>Title: {currentBadge.title}</p>
              {currentBadge.subtitle && <p>Subtitle: {currentBadge.subtitle}</p>}
              <p>Template: {currentBadge.templateId || 'Custom'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Badge Editor */}
      {(!currentBadge || isEditing) && (
        <div className="space-y-4">
          {/* Preview */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <ThreadRing88x31Badge {...getPreviewBadge()} />
          </div>

          {/* Mode Selection */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPreviewMode('template')}
              className={`px-3 py-2 text-sm rounded ${
                previewMode === 'template' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Use Template
            </button>
            <button
              onClick={() => setPreviewMode('custom')}
              className={`px-3 py-2 text-sm rounded ${
                previewMode === 'custom' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Custom Colors
            </button>
            <button
              onClick={() => setPreviewMode('upload')}
              className={`px-3 py-2 text-sm rounded ${
                previewMode === 'upload' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Upload Image
            </button>
          </div>

          {/* Template Selection */}
          {previewMode === 'template' && (
            <div>
              <label className="block text-sm font-medium mb-2">Choose Template:</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-2 border rounded cursor-pointer text-center ${
                      editedBadge.templateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <ThreadRing88x31Badge
                      templateId={template.id}
                      title={editedBadge.title || threadRingName}
                      subtitle={editedBadge.subtitle}
                    />
                    <p className="text-xs mt-1">{template.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Colors */}
          {previewMode === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Background Color:</label>
                <input
                  type="color"
                  value={editedBadge.backgroundColor || '#4A90E2'}
                  onChange={(e) => setEditedBadge({
                    ...editedBadge,
                    backgroundColor: e.target.value,
                    templateId: undefined
                  })}
                  className="w-full h-10 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Text Color:</label>
                <input
                  type="color"
                  value={editedBadge.textColor || '#FFFFFF'}
                  onChange={(e) => setEditedBadge({
                    ...editedBadge,
                    textColor: e.target.value,
                    templateId: undefined
                  })}
                  className="w-full h-10 border border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {/* Image Upload */}
          {previewMode === 'upload' && (
            <div>
              <label className="block text-sm font-medium mb-1">Custom Badge Image (88x31 pixels):</label>
              <input
                type="url"
                placeholder="https://example.com/badge.png"
                value={editedBadge.imageUrl || ''}
                onChange={(e) => setEditedBadge({
                  ...editedBadge,
                  imageUrl: e.target.value,
                  templateId: undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload your image to a hosting service and paste the URL here. Recommended size: 88x31 pixels.
              </p>
            </div>
          )}

          {/* Text Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title:</label>
              <input
                type="text"
                placeholder={threadRingName}
                maxLength={15}
                value={editedBadge.title || ''}
                onChange={(e) => setEditedBadge({
                  ...editedBadge,
                  title: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Max 15 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subtitle (optional):</label>
              <input
                type="text"
                placeholder="@threadring"
                maxLength={12}
                value={editedBadge.subtitle || ''}
                onChange={(e) => setEditedBadge({
                  ...editedBadge,
                  subtitle: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Max 12 characters</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Badge'}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedBadge(currentBadge || {});
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="mt-6 p-3 bg-gray-50 rounded text-sm text-gray-600">
        <p className="font-medium mb-1">About 88x31 Badges:</p>
        <p>
          These classic web badges are reminiscent of the original webring culture from the early web. 
          Your badge will be displayed on your ThreadRing page and can be used by members to link back to your community.
        </p>
      </div>
    </div>
  );
}