import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import ThreadRingInviteForm from "../../../components/ui/forms/ThreadRingInviteForm";
import ThreadRingPromptManager from "../../../components/core/threadring/ThreadRingPromptManager";
import ThreadRingBlockManager from "../../../components/core/threadring/ThreadRingBlockManager";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { PixelIcon } from "../../../components/ui/PixelIcon";

interface ThreadRingSettingsPageProps {
  siteConfig: SiteConfig;
  ring: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    shortCode?: string | null;
    joinType: string;
    visibility: string;
    postPolicy?: string;
    curatorNote?: string | null;
    bannerUrl?: string | null;
    themeColor?: string | null;
    memberCount: number;
    postCount: number;
  } | null;
  canManage: boolean;
  error?: string;
}

export default function ThreadRingSettingsPage({
  siteConfig,
  ring,
  canManage,
  error
}: ThreadRingSettingsPageProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: ring?.name || "",
    description: ring?.description || "",
    shortCode: ring?.shortCode || "",
    joinType: ring?.joinType || "open",
    visibility: ring?.visibility || "public",
    postPolicy: ring?.postPolicy || "members",
    curatorNote: ring?.curatorNote || "",
    bannerUrl: ring?.bannerUrl || "",
    themeColor: ring?.themeColor || "thread-pine"
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (error || !ring) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center text-red-600">
            {error || "ThreadRing not found"}
          </div>
        </div>
      </Layout>
    );
  }

  if (!canManage) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600">
              Only the Ring Host can access ThreadRing settings.
            </p>
            <button
              onClick={() => router.push(`/tr/${ring.slug}`)}
              className="mt-4 border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            >
              Back to ThreadRing
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await csrfFetch(`/api/threadrings/${ring.slug}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSaveSuccess(true);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setSaveError(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">ThreadRing Settings</h1>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/tr/${ring.slug}/members`)}
                className="flex items-center gap-2 border border-black px-4 py-2 bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000]"
              >
                <PixelIcon name="users" className="w-4 h-4" />
                Manage Members
              </button>
              <button
                onClick={() => router.push(`/tr/${ring.slug}`)}
                className="flex items-center gap-2 border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
              >
                <PixelIcon name="arrow-left" className="w-4 h-4" />
                Back to ThreadRing
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            Manage settings for <strong>{ring.name}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Settings */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="sliders" className="w-6 h-6" />
                Basic Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    ThreadRing Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
                    maxLength={100}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {formData.name.length}/100 characters
                  </div>
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium mb-2">
                    ThreadRing Slug (URL)
                  </label>
                  <div className="bg-gray-50 border border-gray-300 p-3">
                    <div className="text-gray-700 font-mono">{ring.slug}</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Slug cannot be changed after creation
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={4}
                    className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000] resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {formData.description.length}/500 characters
                  </div>
                </div>

                <div>
                  <label htmlFor="curatorNote" className="block text-sm font-medium mb-2">
                    Ring Host&apos;s Note (Optional)
                  </label>
                  <textarea
                    id="curatorNote"
                    value={formData.curatorNote}
                    onChange={(e) => handleChange("curatorNote", e.target.value)}
                    rows={3}
                    className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000] resize-none"
                    placeholder="A message to display to members..."
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {formData.curatorNote.length}/1000 characters
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Identity */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="image" className="w-6 h-6" />
                Visual Identity
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="bannerUrl" className="block text-sm font-medium mb-2">
                    Banner Image URL
                  </label>
                  <input
                    type="url"
                    id="bannerUrl"
                    value={formData.bannerUrl}
                    onChange={(e) => handleChange("bannerUrl", e.target.value)}
                    className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
                    placeholder="https://example.com/banner.jpg"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    Recommended size: 1200x300px. Leave empty for default.
                  </div>
                </div>

                <div>
                  <label htmlFor="themeColor" className="block text-sm font-medium mb-2">
                    Theme Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'thread-pine', name: 'Pine', hex: '#2C5F2D' },
                      { id: 'thread-sage', name: 'Sage', hex: '#97BC62' },
                      { id: 'thread-clay', name: 'Clay', hex: '#D4A373' },
                      { id: 'thread-stone', name: 'Stone', hex: '#A9A9A9' },
                      { id: 'thread-ocean', name: 'Ocean', hex: '#4A90E2' },
                      { id: 'thread-berry', name: 'Berry', hex: '#C2185B' },
                    ].map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleChange("themeColor", color.id)}
                        className={`w-8 h-8 rounded-full border-2 ${formData.themeColor === color.id ? 'border-black ring-2 ring-offset-2 ring-black' : 'border-transparent'
                          }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-medium">{formData.themeColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Settings */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="lock" className="w-6 h-6" />
                Access Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="joinType" className="block text-sm font-medium mb-2">
                    Who can join?
                  </label>
                  <select
                    id="joinType"
                    value={formData.joinType}
                    onChange={(e) => handleChange("joinType", e.target.value)}
                    className="w-full border border-black p-3 bg-white focus:outline-none"
                  >
                    <option value="open">Open - Anyone can join</option>
                    <option value="application">Application - Requires approval</option>
                    <option value="invite">Invite Only - Members by invitation</option>
                    <option value="closed">Closed - No new members</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="visibility" className="block text-sm font-medium mb-2">
                    ThreadRing Visibility
                  </label>
                  <select
                    id="visibility"
                    value={formData.visibility}
                    onChange={(e) => handleChange("visibility", e.target.value)}
                    className="w-full border border-black p-3 bg-white focus:outline-none"
                  >
                    <option value="public">Public - Visible to everyone</option>
                    <option value="unlisted">Unlisted - Only visible via direct link</option>
                    <option value="private">Private - Only visible to members</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="postPolicy" className="block text-sm font-medium mb-2">
                    Who can post?
                  </label>
                  <select
                    id="postPolicy"
                    value={formData.postPolicy}
                    onChange={(e) => handleChange("postPolicy", e.target.value)}
                    className="w-full border border-black p-3 bg-white focus:outline-none"
                  >
                    <option value="open">Open - Anyone can post</option>
                    <option value="members">Members - Only members can post</option>
                    <option value="curated">Curated - Posts require approval</option>
                    <option value="closed">Closed - No new posts allowed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Badge Manager Link */}
            <div className="bg-white border border-black rounded-none shadow-[3px_3px_0_#000] p-6 text-center">
              <div className="mb-4 flex justify-center">
                <PixelIcon name="trophy" className="w-12 h-12 text-yellow-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">ThreadRing Badge Design</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage the badge design and artwork for this ThreadRing
              </p>
              <a
                href={`/tr/${ring.slug}/badge-manager`}
                className="px-6 py-3 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline"
              >
                Manage Badge Design →
              </a>
            </div>

            {/* Prompts & Challenges Manager */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="script" className="w-6 h-6" />
                Prompts & Challenges
              </h2>
              <ThreadRingPromptManager
                threadRingSlug={ring.slug}
                canManage={canManage}
              />
            </div>

            {/* Block Management */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="shield" className="w-6 h-6" />
                Blocked Users
              </h2>
              <ThreadRingBlockManager
                threadRingSlug={ring.slug}
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 sticky bottom-4 bg-white/90 backdrop-blur border border-black p-4 shadow-[2px_2px_0_#000] z-10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <PixelIcon name="reload" className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <PixelIcon name="check" className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>

              {saveError && (
                <div className="text-red-600 text-sm font-medium">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="text-green-600 text-sm font-medium flex items-center gap-2">
                  <PixelIcon name="check" className="w-4 h-4" />
                  Settings saved successfully!
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="chart" className="w-5 h-5" />
                ThreadRing Stats
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Members:</dt>
                  <dd className="font-medium">{ring.memberCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Posts:</dt>
                  <dd className="font-medium">{ring.postCount}</dd>
                </div>
              </dl>
            </div>

            {/* Invite Members (for invite-only) */}
            {formData.joinType === "invite" && (
              <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <PixelIcon name="user-plus" className="w-5 h-5" />
                  Invite Members
                </h3>
                <ThreadRingInviteForm
                  threadRingSlug={ring.slug}
                  threadRingName={ring.name}
                />
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-300 p-6">
              <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                <PixelIcon name="alert" className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Careful! These actions cannot be undone.
              </p>
              <button
                className="w-full border border-red-300 px-4 py-2 bg-white text-red-700 hover:bg-red-100 flex items-center justify-center gap-2"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this ThreadRing? This action cannot be undone.")) {
                    // TODO: Implement delete
                    // TODO: Implement delete functionality
                  }
                }}
              >
                <PixelIcon name="trash" className="w-4 h-4" />
                Delete ThreadRing
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const { slug } = context.query;
  const session = context.req.cookies.retro_session;
  // Session and cookie validation

  if (typeof slug !== "string") {
    return {
      props: {
        siteConfig,
        ring: null,
        canManage: false,
        error: "Invalid ThreadRing slug"
      }
    };
  }

  try {
    // Session validation and viewer parsing
    const viewer = await getSessionUser(context.req as any);

    // Try Ring Hub first if enabled
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          const ringHubRing = await client.getRing(slug);

          if (ringHubRing) {
            // Found Ring Hub ring

            // Check ownership via local database tracking (source of truth)
            let canManage = false;

            if (viewer) {
              // Checking permissions

              try {
                // Check local ownership tracking first (this is our source of truth)
                const ringHubOwnership = await db.ringHubOwnership.findUnique({
                  where: { ringSlug: slug }
                });
                // Local ownership record found

                if (ringHubOwnership && ringHubOwnership.ownerUserId === viewer.id) {
                  canManage = true;
                  // User is owner via local ownership tracking
                } else {
                  // No local ownership found
                }

              } catch (ownershipError: any) {
                console.warn('⚠️ [SETTINGS] Error checking local ownership:', ownershipError.message);
              }

              // Permission check complete
            } else {
              // No viewer found
            }

            return {
              props: {
                siteConfig,
                ring: {
                  id: ringHubRing.id,
                  name: ringHubRing.name,
                  slug: ringHubRing.slug,
                  description: ringHubRing.description,
                  shortCode: ringHubRing.shortCode || null,
                  joinType: (() => {
                    const policyMap = {
                      'OPEN': 'open',
                      'INVITATION': 'invite',
                      'APPLICATION': 'application',
                      'CLOSED': 'closed'
                    } as const;
                    return policyMap[ringHubRing.joinPolicy as keyof typeof policyMap] || 'open';
                  })(),
                  visibility: ringHubRing.visibility?.toLowerCase() || 'public',
                  postPolicy: (() => {
                    const policyMap = {
                      'OPEN': 'open',
                      'MEMBERS': 'members',
                      'CURATED': 'curated',
                      'CLOSED': 'closed'
                    } as const;
                    return policyMap[ringHubRing.postPolicy as keyof typeof policyMap] || 'members';
                  })(),
                  curatorNote: ringHubRing.curatorNote || null,
                  bannerUrl: ringHubRing.bannerUrl || null,
                  themeColor: ringHubRing.themeColor || null,
                  memberCount: ringHubRing.memberCount || 0,
                  postCount: ringHubRing.postCount || 0
                },
                canManage
              }
            };
          }
        } catch (ringHubError) {
          console.error("Ring Hub error:", ringHubError);
        }
      }
    }

    // Fall back to local database
    const ring = await db.threadRing.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        joinType: true,
        visibility: true,
        curatorNote: true,
        bannerUrl: true,
        themeColor: true,
        curatorId: true,
        memberCount: true,
        postCount: true
      }
    });

    if (!ring) {
      return {
        props: {
          siteConfig,
          ring: null,
          canManage: false,
          error: "ThreadRing not found"
        }
      };
    }

    const canManage = viewer?.id === ring.curatorId;

    return {
      props: {
        siteConfig,
        ring: {
          ...ring,
          shortCode: null,
          postPolicy: 'members'
        },
        canManage
      }
    };
  } catch (error) {
    console.error("Error fetching ThreadRing settings:", error);
    return {
      props: {
        siteConfig,
        ring: null,
        canManage: false,
        error: "Failed to load ThreadRing settings"
      }
    };
  }
};