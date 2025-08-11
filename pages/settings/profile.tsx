import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import RetroCard from "@/components/RetroCard";

export default function SettingsProfile() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [customCSS, setCustomCSS] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Prefill from /api/auth/me + /api/profile/<handle>
  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (!me?.loggedIn) return;
      const handle = me.user?.primaryHandle?.split("@")[0];
      if (!handle) return;
      const p = await fetch(`/api/profile/${handle}`).then(r => r.json());
      setDisplayName(p.profile?.displayName ?? "");
      setBio(p.profile?.bio ?? "");
      setAvatarUrl(p.profile?.avatarUrl ?? "");
      setCustomCSS(p.profile?.customCSS ?? "");
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) { setMsg("Please log in."); setBusy(false); return; }
      const { token } = await capRes.json();

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, avatarUrl, customCSS, cap: token }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("Saved!");
    } catch (e: any) {
      setMsg(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <RetroCard title="Edit profile">
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Display name</label>
            <input className="border border-black p-2 bg-white w-full max-w-md"
                   value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Bio</label>
            <textarea className="border border-black p-2 bg-white w-full max-w-xl" rows={4}
                      value={bio} onChange={e => setBio(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Avatar URL</label>
            <input className="border border-black p-2 bg-white w-full max-w-xl"
                   value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Custom CSS (sanitized)</label>
            <textarea className="border border-black p-2 bg-white w-full max-w-3xl font-mono text-xs" rows={10}
                      value={customCSS} onChange={e => setCustomCSS(e.target.value)} />
            <div className="text-xs opacity-70 mt-1">
              We block dangerous rules like <code>@import</code>, <code>expression()</code>, and <code>javascript:</code> URLs.
            </div>
          </div>

          <button
            className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {msg && <span className="ml-3 text-sm">{msg}</span>}
        </form>
      </RetroCard>
    </Layout>
  );
}
