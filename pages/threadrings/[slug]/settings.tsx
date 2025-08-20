import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import ThreadRingInviteForm from "../../../components/forms/ThreadRingInviteForm";
import ThreadRingBadgeManager from "../../../components/ThreadRingBadgeManager";

interface ThreadRingSettingsPageProps {
  siteConfig: SiteConfig;
  ring: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    joinType: string;
    visibility: string;
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
    joinType: ring?.joinType || "open",
    visibility: ring?.visibility || "public",
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
              onClick={() => router.push(`/threadrings/${ring.slug}`)}
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
      
      // If slug changed, redirect to new URL
      if (data.newSlug && data.newSlug !== ring.slug) {
        setTimeout(() => {
          router.push(`/threadrings/${data.newSlug}/settings`);
        }, 1000);
      }
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
                onClick={() => router.push(`/threadrings/${ring.slug}/members`)}
                className="border border-black px-4 py-2 bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000]"
              >
                Manage Members
              </button>
              <button
                onClick={() => router.push(`/threadrings/${ring.slug}`)}
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
                  <p className="text-xs text-gray-600 mt-1">
                    Changing the name will update the URL slug
                  </p>
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
                    Curator&apos;s Note (Optional)
                  </label>
                  <textarea
                    id="curatorNote"
                    value={formData.curatorNote}
                    onChange={(e) => handleChange("curatorNote", e.target.value)}
                    rows={3}
                    className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000] resize-none"
                    placeholder="A message to display to members..."
                    maxLength={300}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {formData.curatorNote.length}/300 characters
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
              </div>
            </div>

            {/* Badge Manager */}
            <ThreadRingBadgeManager
              threadRingSlug={ring.slug}
              threadRingName={ring.name}
              onBadgeUpdate={() => {
                // Could add refresh logic here if needed
                console.log('Badge updated');
              }}
            />

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              
              {saveSuccess && (
                <span className="text-green-600 font-medium">
                  ✓ Settings saved successfully
                </span>
              )}
              
              {saveError && (
                <span className="text-red-600">
                  {saveError}
                </span>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white border border-black p-4 shadow-[2px_2px_0_#000]">
              <h3 className="font-bold mb-3">ThreadRing Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Members:</span>
                  <span className="font-medium">{ring.memberCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Posts:</span>
                  <span className="font-medium">{ring.postCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slug:</span>
                  <span className="font-mono text-xs">{ring.slug}</span>
                </div>
              </div>
            </div>

            {/* Invite Members */}
            {formData.joinType === "invite" && (
              <ThreadRingInviteForm
                threadRingSlug={ring.slug}
                threadRingName={ring.name}
              />
            )}

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-300 p-4">
              <h3 className="font-bold mb-3 text-red-800">Danger Zone</h3>
              <p className="text-sm text-red-700 mb-3">
                Once you delete a ThreadRing, there is no going back.
              </p>
              <button
                className="w-full border border-red-500 px-4 py-2 bg-white hover:bg-red-100 text-red-600 text-sm font-medium"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${ring.name}"? This action cannot be undone.`)) {
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
  const { slug } = context.params!;
  
  if (typeof slug !== "string") {
    return {
      props: {
        siteConfig,
        ring: null,
        canManage: false,
        error: "Invalid ThreadRing URL",
      },
    };
  }

  const viewer = await getSessionUser(context.req as any);

  try {
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
        memberCount: true,
        postCount: true,
        curatorId: true,
      },
    });

    if (!ring) {
      return {
        props: {
          siteConfig,
          ring: null,
          canManage: false,
          error: "ThreadRing not found",
        },
      };
    }

    // Check if viewer is the curator
    const canManage = viewer?.id === ring.curatorId;

    return {
      props: {
        siteConfig,
        ring: {
          ...ring,
          joinType: ring.joinType as string,
          visibility: ring.visibility as string,
        },
        canManage,
      },
    };
  } catch (error: any) {
    console.error("Settings page error:", error);
    return {
      props: {
        siteConfig,
        ring: null,
        canManage: false,
        error: "Failed to load ThreadRing",
      },
    };
  }
};