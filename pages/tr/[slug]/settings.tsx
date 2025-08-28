import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { featureFlags } from "@/lib/feature-flags";
import { getRingHubClient } from "@/lib/ringhub-client";
import ThreadRingInviteForm from "../../../components/forms/ThreadRingInviteForm";
import ThreadRingPromptManager from "../../../components/ThreadRingPromptManager";
import ThreadRingBlockManager from "../../../components/ThreadRingBlockManager";

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
    curatorNote: ring?.curatorNote || ""
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
              Only the curator can access ThreadRing settings.
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
      const response = await fetch(`/api/threadrings/${ring.slug}/settings`, {
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
                className="border border-black px-4 py-2 bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000]"
              >
                Manage Members
              </button>
              <button
                onClick={() => router.push(`/tr/${ring.slug}`)}
                className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
              >
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
              <h2 className="text-xl font-bold mb-4">Basic Settings</h2>
              
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

                {/* Short Code field hidden for now - not commonly used
                <div>
                  <label htmlFor="shortCode" className="block text-sm font-medium mb-2">
                    Short Code (Optional)
                  </label>
                  <input
                    type="text"
                    id="shortCode"
                    value={formData.shortCode}
                    onChange={(e) => handleChange("shortCode", e.target.value.toUpperCase())}
                    className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
                    maxLength={10}
                    pattern="[A-Z0-9-]+"
                    placeholder="e.g., TC, TECH"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    2-10 alphanumeric characters and hyphens ({formData.shortCode.length}/10)
                  </div>
                </div>
                */}

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
                    Curator&apos;s Note (Optional)
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

            {/* Access Settings */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4">Access Settings</h2>
              
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
              <div className="mb-4">
                <span className="text-5xl">🏆</span>
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
            <div className="border-t pt-6">
              <ThreadRingPromptManager
                threadRingSlug={ring.slug}
                canManage={canManage}
              />
            </div>

            {/* Block Management */}
            <div className="border-t pt-6">
              <ThreadRingBlockManager
                threadRingSlug={ring.slug}
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              
              {saveError && (
                <div className="text-red-600 text-sm">
                  {saveError}
                </div>
              )}
              
              {saveSuccess && (
                <div className="text-green-600 text-sm">
                  Settings saved successfully!
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h3 className="font-bold mb-4">ThreadRing Stats</h3>
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
                <h3 className="font-bold mb-4">Invite Members</h3>
                <ThreadRingInviteForm 
                  threadRingSlug={ring.slug} 
                  threadRingName={ring.name}
                />
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-300 p-6">
              <h3 className="font-bold text-red-800 mb-4">Danger Zone</h3>
              <p className="text-sm text-red-700 mb-4">
                Careful! These actions cannot be undone.
              </p>
              <button
                className="w-full border border-red-300 px-4 py-2 bg-white text-red-700 hover:bg-red-100"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this ThreadRing? This action cannot be undone.")) {
                    // TODO: Implement delete
                    console.log("Delete ThreadRing");
                  }
                }}
              >
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
  console.log('🔍 [SETTINGS] Raw cookies:', Object.keys(context.req.cookies));
  console.log('🔍 [SETTINGS] retro_session cookie:', session ? 'exists' : 'missing');
  
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
    console.log('🔍 [SETTINGS] Session cookie:', session ? 'present' : 'missing');
    const viewer = await getSessionUser(context.req as any);
    console.log('🔍 [SETTINGS] Parsed viewer:', viewer ? viewer.id : 'null');

    // Try Ring Hub first if enabled
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          const ringHubRing = await client.getRing(slug);
          
          if (ringHubRing) {
            console.log('🔍 [SETTINGS] Found Ring Hub ring:', ringHubRing.slug);
            console.log('🔍 [SETTINGS] Ring owner DID in Ring Hub:', ringHubRing.ownerDid);
            
            // Check ownership via local database tracking (source of truth)
            let canManage = false;
            
            if (viewer) {
              console.log('🔍 [SETTINGS] Checking permissions for viewer ID:', viewer.id);
              
              try {
                // Check local ownership tracking first (this is our source of truth)
                const ringHubOwnership = await db.ringHubOwnership.findUnique({
                  where: { ringSlug: slug }
                });
                console.log('🔍 [SETTINGS] Local ownership record:', ringHubOwnership);
                
                if (ringHubOwnership && ringHubOwnership.ownerUserId === viewer.id) {
                  canManage = true;
                  console.log('✅ [SETTINGS] User is owner via local ownership tracking');
                } else {
                  console.log('❌ [SETTINGS] No local ownership found for this user');
                }
                
              } catch (ownershipError: any) {
                console.warn('⚠️ [SETTINGS] Error checking local ownership:', ownershipError.message);
              }
              
              console.log('🏁 [SETTINGS] Final canManage result:', canManage);
            } else {
              console.log('❌ [SETTINGS] No viewer found');
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