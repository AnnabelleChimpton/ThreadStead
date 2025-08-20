import React, { useState } from "react";
import BadgeSelector from "../BadgeSelector";

type ThreadRingJoinType = "open" | "invite" | "closed";
type ThreadRingVisibility = "public" | "unlisted" | "private";

type CreateThreadRingFormProps = {
  onCreated?: (ring: any) => void | Promise<void>;
};

const JOIN_TYPE_OPTIONS: { value: ThreadRingJoinType; label: string; description: string }[] = [
  { value: "open", label: "Open", description: "Anyone can join" },
  { value: "invite", label: "Invite Only", description: "Members must be invited" },
  { value: "closed", label: "Closed", description: "No new members allowed" },
];

const VISIBILITY_OPTIONS: { value: ThreadRingVisibility; label: string; description: string }[] = [
  { value: "public", label: "Public", description: "Visible in directory and searchable" },
  { value: "unlisted", label: "Unlisted", description: "Direct link only" },
  { value: "private", label: "Private", description: "Members only" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateThreadRingForm({ onCreated }: CreateThreadRingFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [joinType, setJoinType] = useState<ThreadRingJoinType>("open");
  const [visibility, setVisibility] = useState<ThreadRingVisibility>("public");
  const [autoSlug, setAutoSlug] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badgeData, setBadgeData] = useState<{
    templateId?: string;
    backgroundColor?: string;
    textColor?: string;
    title?: string;
    subtitle?: string;
  }>({ templateId: 'classic_blue' });

  // Auto-generate slug from name
  React.useEffect(() => {
    if (autoSlug && name) {
      setSlug(slugify(name));
    }
  }, [name, autoSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Ring name is required");
      return;
    }

    if (!slug.trim()) {
      setError("Ring URL is required");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/threadrings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          joinType,
          visibility,
          badge: badgeData,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.log("Error response:", responseText);
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || `Failed to create ThreadRing: ${response.status}`);
        } catch {
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
        }
      }

      const { ring } = await response.json();
      
      // Reset form
      setName("");
      setSlug("");
      setDescription("");
      setJoinType("open");
      setVisibility("public");
      setAutoSlug(true);
      setBadgeData({ templateId: 'classic_blue' });
      
      await onCreated?.(ring);
    } catch (err: any) {
      setError(err.message || "Failed to create ThreadRing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-black p-4 bg-white shadow-[2px_2px_0_#000] space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Create New ThreadRing</h2>
        <p className="text-sm text-gray-600">
          ThreadRings are communities where members can share posts and engage around common interests.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">Ring Name *</label>
        <input
          type="text"
          className="w-full border border-black p-2 bg-white font-sans"
          placeholder="e.g., Web Development"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">Ring URL *</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">/threadrings/</span>
          <input
            type="text"
            className="flex-1 border border-black p-2 bg-white font-sans font-mono text-sm"
            placeholder="web-development"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setAutoSlug(false);
            }}
            disabled={busy}
            pattern="[a-z0-9-]+"
            maxLength={50}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-slug"
            checked={autoSlug}
            onChange={(e) => setAutoSlug(e.target.checked)}
            disabled={busy}
          />
          <label htmlFor="auto-slug" className="text-sm">Auto-generate from name</label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">Description</label>
        <textarea
          className="w-full border border-black p-2 bg-white font-sans"
          rows={3}
          placeholder="What is this ThreadRing about? (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
          maxLength={500}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Who can join?</label>
          <select
            className="w-full border border-black bg-white p-2"
            value={joinType}
            onChange={(e) => setJoinType(e.target.value as ThreadRingJoinType)}
            disabled={busy}
          >
            {JOIN_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600">
            {JOIN_TYPE_OPTIONS.find(o => o.value === joinType)?.description}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold">Visibility</label>
          <select
            className="w-full border border-black bg-white p-2"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ThreadRingVisibility)}
            disabled={busy}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600">
            {VISIBILITY_OPTIONS.find(o => o.value === visibility)?.description}
          </p>
        </div>
      </div>

      {/* Badge Selection */}
      <div className="space-y-2">
        <BadgeSelector
          threadRingName={name || "ThreadRing"}
          onBadgeChange={setBadgeData}
          initialBadge={badgeData}
          compact={true}
        />
      </div>

      {error && (
        <div className="text-red-700 text-sm bg-red-50 border border-red-200 p-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              const response = await fetch("/api/threadrings/minimal-test", {
                method: "GET",
              });
              const data = await response.text();
              console.log("Test response:", response.status, data);
              alert(`Minimal Test: ${response.status} - ${data.substring(0, 100)}`);
            } catch (err) {
              console.error("Test error:", err);
              alert(`Test error: ${err}`);
            }
          }}
          className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] font-semibold"
        >
          Test API
        </button>
        <button
          type="submit"
          className="border border-black px-4 py-2 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-semibold"
          disabled={busy || !name.trim() || !slug.trim()}
        >
          {busy ? "Creating..." : "Create ThreadRing"}
        </button>
      </div>
    </form>
  );
}