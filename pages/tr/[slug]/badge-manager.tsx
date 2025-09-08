import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import ThreadRing88x31Badge from '@/components/core/threadring/ThreadRing88x31Badge';
import { getSessionUser } from '@/lib/auth-server';
import { featureFlags } from '@/lib/feature-flags';
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client';
import { db } from '@/lib/db';
import { BADGE_TEMPLATES, type BadgeTemplate } from '@/lib/threadring-badges';
import { generateBadge, type BadgeGenerationOptions } from '@/lib/badge-generator';

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
  title: string;
  subtitle?: string;
  templateId?: string;
  backgroundColor?: string;
  textColor?: string;
  customImageUrl?: string;
  description?: string;
  criteria?: string;
}

export default function BadgeManagerPage({ ring, user, canManage }: BadgeManagerPageProps) {
  const router = useRouter();
  
  // Unified badge state
  const [currentBadge, setCurrentBadge] = useState<BadgeDesign | null>(null);
  const [editedBadge, setEditedBadge] = useState<Partial<BadgeDesign>>({});
  const [templates] = useState<BadgeTemplate[]>(BADGE_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'template' | 'custom' | 'upload'>('template');

  // Access control based on server-side permission check
  const canManageBadge = canManage;

  useEffect(() => {
    if (canManageBadge) {
      loadCurrentBadge();
    }
  }, [ring.slug, canManageBadge]);

  const loadCurrentBadge = async () => {
    try {
      // Try to load existing local badge configuration
      const response = await fetch(`/api/threadrings/${ring.slug}/badge`);
      if (response.ok) {
        const data = await response.json();
        if (data.badge) {
          const badge: BadgeDesign = {
            title: data.badge.title || ring.name,
            subtitle: data.badge.subtitle,
            templateId: data.badge.templateId,
            backgroundColor: data.badge.backgroundColor,
            textColor: data.badge.textColor,
            customImageUrl: data.badge.imageUrl,
            description: `Badge for ${ring.name} ThreadRing`,
            criteria: 'Active participation in the ThreadRing community'
          };
          setCurrentBadge(badge);
          setEditedBadge(badge);
          return;
        }
      }
      
      // If no existing badge, set up default
      const defaultBadge: BadgeDesign = {
        title: ring.name,
        description: `Badge for ${ring.name} ThreadRing`,
        criteria: 'Active participation in the ThreadRing community'
      };
      setCurrentBadge(defaultBadge);
      setEditedBadge(defaultBadge);
    } catch (error) {
      console.error('Failed to load current badge:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Generate the badge (either from template or use custom image)
      let generatedBadgeUrl: string | undefined;
      let generatedHighResUrl: string | undefined;

      if (editedBadge.customImageUrl) {
        // User provided custom image URL - validate and use it
        const isValidUrl = editedBadge.customImageUrl.startsWith('https://');
        if (!isValidUrl) {
          setError('Custom image URL must be a valid HTTPS URL');
          return;
        }
        generatedBadgeUrl = editedBadge.customImageUrl;
      } else {
        // Generate badge from template/colors and upload to S3
        const response = await fetch(`/api/threadrings/${ring.slug}/generate-and-upload-badge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editedBadge.title || ring.name,
            subtitle: editedBadge.subtitle,
            templateId: editedBadge.templateId,
            backgroundColor: editedBadge.backgroundColor,
            textColor: editedBadge.textColor,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to generate badge');
          return;
        }

        const uploadResult = await response.json();
        generatedBadgeUrl = uploadResult.badgeImageUrl;
        generatedHighResUrl = uploadResult.badgeImageHighResUrl;
      }

      // Step 2: Update RingHub with the generated/provided image URL
      const ringHubUpdateData: any = {};
      
      if (generatedBadgeUrl) {
        ringHubUpdateData.badgeImageUrl = generatedBadgeUrl;
      }
      
      if (generatedHighResUrl) {
        ringHubUpdateData.badgeImageHighResUrl = generatedHighResUrl;
      }
      
      if (editedBadge.description?.trim()) {
        ringHubUpdateData.description = editedBadge.description.trim();
      }
      
      if (editedBadge.criteria?.trim()) {
        ringHubUpdateData.criteria = editedBadge.criteria.trim();
      }

      // Always regenerate existing badges when updating
      ringHubUpdateData.updateExistingBadges = true;

      const ringHubResponse = await fetch(`/api/threadrings/${ring.slug}/update-badge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ringHubUpdateData),
      });

      if (ringHubResponse.ok) {
        const result = await ringHubResponse.json();
        
        // Step 3: Save the badge configuration locally for future editing
        const localBadgeData = {
          title: editedBadge.title || ring.name,
          subtitle: editedBadge.subtitle,
          templateId: editedBadge.templateId,
          backgroundColor: editedBadge.backgroundColor,
          textColor: editedBadge.textColor,
          imageUrl: editedBadge.customImageUrl || generatedBadgeUrl,
          isActive: true
        };

        await fetch(`/api/threadrings/${ring.slug}/badge`, {
          method: currentBadge ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(localBadgeData),
        });

        setCurrentBadge(editedBadge as BadgeDesign);
        setIsEditing(false);
        setSuccess(`Badge updated successfully! ${result.badgesUpdated ? `(${result.badgesUpdated} member badges regenerated)` : ''}`);
      } else {
        const errorData = await ringHubResponse.json();
        setError(errorData.error || 'Failed to update RingHub badge');
      }
    } catch (error) {
      console.error('Badge save error:', error);
      setError('Network error occurred while updating badge');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditedBadge({
        ...editedBadge,
        templateId: template.id,
        backgroundColor: undefined,
        textColor: undefined,
        customImageUrl: undefined
      });
      setPreviewMode('template');
    }
  };

  const getPreviewBadge = () => {
    const badge: any = {
      title: editedBadge.title || ring.name,
      subtitle: editedBadge.subtitle,
      imageUrl: editedBadge.customImageUrl,
      isGenerated: false,
      isActive: true
    };

    if (editedBadge.templateId) {
      badge.templateId = editedBadge.templateId;
    } else {
      badge.backgroundColor = editedBadge.backgroundColor || '#4A90E2';
      badge.textColor = editedBadge.textColor || '#FFFFFF';
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
              <h3 className="text-xl font-bold text-black mb-2">🎨 ThreadRing Badge Designer</h3>
              <p className="text-gray-700">
                Design your ThreadRing badge using templates, custom colors, or upload your own image. 
                The badge will be uploaded to our servers and sent to RingHub to update all member badges.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Badge Preview */}
              {currentBadge && !isEditing && (
                <div>
                  <h4 className="font-bold text-lg mb-3">Current Badge</h4>
                  <div className="flex items-center gap-4">
                    <ThreadRing88x31Badge
                      title={currentBadge.title}
                      subtitle={currentBadge.subtitle}
                      templateId={currentBadge.templateId}
                      backgroundColor={currentBadge.backgroundColor}
                      textColor={currentBadge.textColor}
                      imageUrl={currentBadge.customImageUrl}
                    />
                    <div className="text-sm text-gray-600">
                      <p><strong>Title:</strong> {currentBadge.title}</p>
                      {currentBadge.subtitle && <p><strong>Subtitle:</strong> {currentBadge.subtitle}</p>}
                      <p><strong>Template:</strong> {currentBadge.templateId || 'Custom'}</p>
                      {currentBadge.description && <p><strong>Description:</strong> {currentBadge.description}</p>}
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                    >
                      ✏️ Edit Badge Design
                    </button>
                  </div>
                </div>
              )}

              {/* Badge Designer */}
              {(!currentBadge || isEditing) && (
                <div className="space-y-6">
                  {/* Live Preview */}
                  <div>
                    <h4 className="font-bold text-lg mb-3">Badge Preview</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4 inline-block">
                      <ThreadRing88x31Badge {...getPreviewBadge()} />
                    </div>
                  </div>

                  {/* Design Mode Selection */}
                  <div>
                    <h4 className="font-bold text-lg mb-3">Design Mode</h4>
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
                  </div>

                  {/* Template Selection */}
                  {previewMode === 'template' && (
                    <div>
                      <h4 className="font-bold text-lg mb-3">Choose Template</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            onClick={() => handleTemplateSelect(template.id)}
                            className={`p-3 border border-black rounded-none cursor-pointer text-center shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] ${
                              editedBadge.templateId === template.id
                                ? 'bg-yellow-100'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <ThreadRing88x31Badge
                              templateId={template.id}
                              title={editedBadge.title || ring.name}
                              subtitle={editedBadge.subtitle}
                            />
                            <p className="text-xs mt-2 font-medium">{template.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Colors */}
                  {previewMode === 'custom' && (
                    <div>
                      <h4 className="font-bold text-lg mb-3">Custom Colors</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-gray-800 mb-2">Background Color:</label>
                          <input
                            type="color"
                            value={editedBadge.backgroundColor || '#4A90E2'}
                            onChange={(e) => setEditedBadge({
                              ...editedBadge,
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
                            value={editedBadge.textColor || '#FFFFFF'}
                            onChange={(e) => setEditedBadge({
                              ...editedBadge,
                              textColor: e.target.value,
                              templateId: undefined
                            })}
                            className="w-full h-12 border border-black rounded-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Image Upload */}
                  {previewMode === 'upload' && (
                    <div>
                      <h4 className="font-bold text-lg mb-3">Custom Image</h4>
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Badge Image URL (HTTPS required):</label>
                        <input
                          type="url"
                          placeholder="https://example.com/badge.png"
                          value={editedBadge.customImageUrl || ''}
                          onChange={(e) => setEditedBadge({
                            ...editedBadge,
                            customImageUrl: e.target.value,
                            templateId: undefined
                          })}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-600 mt-2">
                          Provide a direct HTTPS link to your 88x31 pixel badge image. We&apos;ll use this URL directly.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Text Content */}
                  <div>
                    <h4 className="font-bold text-lg mb-3">Badge Text</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Title:</label>
                        <input
                          type="text"
                          placeholder={ring.name}
                          maxLength={15}
                          value={editedBadge.title || ''}
                          onChange={(e) => setEditedBadge({
                            ...editedBadge,
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
                          value={editedBadge.subtitle || ''}
                          onChange={(e) => setEditedBadge({
                            ...editedBadge,
                            subtitle: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-600 mt-1">Max 12 characters</p>
                      </div>
                    </div>
                  </div>

                  {/* Badge Metadata */}
                  <div>
                    <h4 className="font-bold text-lg mb-3">Badge Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Description:</label>
                        <textarea
                          placeholder="Description of what this badge represents"
                          value={editedBadge.description || ''}
                          onChange={(e) => setEditedBadge({ ...editedBadge, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-800 mb-2">Criteria:</label>
                        <textarea
                          placeholder="What does someone need to do to earn this badge?"
                          value={editedBadge.criteria || ''}
                          onChange={(e) => setEditedBadge({ ...editedBadge, criteria: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-black bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="px-6 py-2 border border-black bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_#000]"
                    >
                      {isLoading ? '🔄 Generating & Uploading...' : '🚀 Generate & Update Badge'}
                    </button>
                    {isEditing && (
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
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Information */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h5 className="font-bold text-blue-900 mb-2">🚀 How It Works</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Design</strong>: Choose a template, set custom colors, or upload your own image</li>
                    <li>• <strong>Generate</strong>: We create an 88x31 badge image and upload it to our S3 storage</li>
                    <li>• <strong>Update RingHub</strong>: The S3 URL is sent to RingHub to update all member badges</li>
                    <li>• <strong>Synchronization</strong>: Local and RingHub always use the same badge image</li>
                  </ul>
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