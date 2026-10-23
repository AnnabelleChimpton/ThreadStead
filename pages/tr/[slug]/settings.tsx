import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { ringSettingsFromHub, type RingSettings } from "@/lib/api/ringhub/ringhub-transformers";
import { readRingAs } from "@/lib/domain/threadrings/ring-access";
import ThreadRingPromptManager from "../../../components/core/threadring/ThreadRingPromptManager";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { PixelIcon } from "../../../components/ui/PixelIcon";
import { useConfirm } from "@/contexts/ConfirmContext";
import { RING_THEMES, ringThemeHex } from "@/lib/rings/theme";

interface ThreadRingSettingsPageProps {
  siteConfig: SiteConfig;
  ring: {
    name: string;
    slug: string;
    memberCount: number;
    postCount: number;
  } | null;
  /** As Ring Hub has them; never the local mirror's placeholders */
  settings: RingSettings | null;
  /** May change the ring's settings (the Host, or a site admin) */
  canEdit: boolean;
  /** Host or moderator: runs the ring's prompts */
  isSteward: boolean;
  isHost: boolean;
  error?: string;
}

type Form = Omit<RingSettings, "themeColor"> & { themeColor: string };

function formFrom(settings: RingSettings | null): Form {
  return {
    name: settings?.name ?? "",
    description: settings?.description ?? "",
    curatorNote: settings?.curatorNote ?? "",
    bannerUrl: settings?.bannerUrl ?? "",
    themeColor: ringThemeHex(settings?.themeColor) ?? "",
    joinType: settings?.joinType ?? "open",
    visibility: settings?.visibility ?? "public",
    postPolicy: settings?.postPolicy ?? "members",
  };
}

// Emptied, these are cleared on Ring Hub (sent as null)
const CLEARABLE = new Set<keyof Form>(["description", "curatorNote", "bannerUrl"]);

/** Only what changed since the form loaded: a save never rewrites what wasn't touched. */
function changesFrom(saved: Form, form: Form): Record<string, string | null> {
  const changes: Record<string, string | null> = {};
  for (const key of Object.keys(form) as (keyof Form)[]) {
    if (form[key] === saved[key]) continue;
    changes[key] = CLEARABLE.has(key) && form[key].trim() === "" ? null : form[key];
  }
  return changes;
}

export default function ThreadRingSettingsPage({
  siteConfig,
  ring,
  settings,
  canEdit,
  isSteward,
  isHost,
  error
}: ThreadRingSettingsPageProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<Form>(() => formFrom(settings));
  const [formData, setFormData] = useState<Form>(() => formFrom(settings));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const confirm = useConfirm();

  if (error || !ring) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center text-red-600">
            {error || "Ring not found"}
          </div>
        </div>
      </Layout>
    );
  }

  if (!canEdit && !isSteward) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Only the Host changes this</h1>
            <p className="text-gray-600">
              A ring&apos;s settings are its Host&apos;s to change.
            </p>
            <button
              onClick={() => router.push(`/tr/${ring.slug}`)}
              className="mt-4 border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            >
              Back to the ring
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleChange = (field: keyof Form, value: string) => {
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
        body: JSON.stringify(changesFrom(saved, formData)),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Couldn't save. Try again.");
      }

      const now = formFrom(data.settings);
      setSaved(now);
      setFormData(now);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error && error.message ? error.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({
      title: `Delete ${ring.name}?`,
      message: "It's gone for good, with its posts list and badge. Your posts stay on your page.",
      confirmText: "Delete",
      variant: "danger",
    }))) return;

    setDeleting(true);
    setSaveError(null);
    try {
      const response = await csrfFetch(`/api/threadrings/${ring.slug}/settings`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Couldn't delete it. Try again.");
      await router.push("/threadrings");
    } catch (error) {
      setSaveError(error instanceof Error && error.message ? error.message : "Couldn't delete it. Try again.");
      setDeleting(false);
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
            {!canEdit && (
              <p className="text-sm text-gray-600">
                You moderate this ring, so its prompts are yours to run. The rest is the Host&apos;s.
              </p>
            )}
            {canEdit && (<>
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
                    Host&apos;s note (optional)
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
                    Theme colour
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {RING_THEMES.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleChange("themeColor", color.hex)}
                        className={`w-8 h-8 rounded-full border-2 ${formData.themeColor === color.hex ? 'border-black ring-2 ring-offset-2 ring-black' : 'border-transparent'
                          }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                        aria-label={color.name}
                        aria-pressed={formData.themeColor === color.hex}
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-medium">{RING_THEMES.find((color) => color.hex === formData.themeColor)?.name ?? (formData.themeColor || "Pine, the site's own")}</span>
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
                    {/* Not offered any more; shown while a ring still has it */}
                    {saved.postPolicy === "open" && (
                      <option value="open">Anyone - Members or not</option>
                    )}
                    <option value="members">Members - Only members can post</option>
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

            </>)}

            {/* Prompts & Challenges Manager */}
            <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PixelIcon name="script" className="w-6 h-6" />
                Prompts & Challenges
              </h2>
              <ThreadRingPromptManager
                threadRingSlug={ring.slug}
                canManage={isSteward}
              />
            </div>

            {/* Save Button */}
            {canEdit && (
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
                  Settings saved.
                </div>
              )}
            </div>
            )}
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

            {/* Inviting is on the members page, for the Host and moderators */}
            <a
              href={`/tr/${ring.slug}/members`}
              className="block bg-white border border-black p-4 shadow-[2px_2px_0_#000] no-underline hover:bg-gray-50"
            >
              <span className="font-bold flex items-center gap-2">
                <PixelIcon name="user-plus" className="w-5 h-5" />
                Invite someone
              </span>
              <span className="text-sm text-gray-600">On the members page</span>
            </a>

            {/* Danger Zone */}
            {isHost && (
            <div className="bg-red-50 border border-red-300 p-6">
              <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                <PixelIcon name="alert" className="w-5 h-5" />
                Danger Zone
              </h3>
              {ring.memberCount <= 1 ? (
                <>
                  <p className="text-sm text-red-700 mb-4">
                    You&apos;re the only one here, so you can delete the ring. It can&apos;t be undone.
                  </p>
                  <button
                    className="w-full border border-red-300 px-4 py-2 bg-white text-red-700 hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <PixelIcon name="trash" className="w-4 h-4" />
                    {deleting ? "Deleting..." : "Delete ring"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-red-700">
                  Others are in this ring, so it can&apos;t be deleted. If you&apos;re stepping away, hand it to one of them on the{" "}
                  <a href={`/tr/${ring.slug}/members`} className="underline">members page</a>.
                </p>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const empty = { ring: null, settings: null, canEdit: false, isSteward: false, isHost: false };

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const { slug } = context.query;
  if (typeof slug !== "string") return { notFound: true };

  const viewer = await getSessionUser(context.req as any);
  if (!viewer) return { redirect: { destination: "/login", permanent: false } };

  // Signed as the viewer, so a private ring's Host can read it. A slow or
  // failing hub shows as such: the form never fills from the local mirror,
  // whose placeholders a Save would push to the hub.
  const access = await raceHubCall(readRingAs(viewer, slug));
  if (access === HUB_TIMEOUT) {
    return {
      props: {
        siteConfig,
        ...empty,
        error: "We can't reach Ring Hub right now, so the settings can't be shown. Try again in a minute.",
      },
    };
  }
  if (!access) return { notFound: true };

  const { ring } = access;
  return {
    props: {
      siteConfig,
      ring: { name: ring.name, slug: ring.slug, memberCount: ring.memberCount ?? 0, postCount: ring.postCount ?? 0 },
      settings: ringSettingsFromHub(ring),
      canEdit: access.manageAs !== null,
      isSteward: access.isSteward,
      isHost: access.isHost,
    },
  };
};
