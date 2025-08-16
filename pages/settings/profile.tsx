import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import RetroCard from "@/components/layout/RetroCard";
import WebsiteManager, { Website } from "@/components/WebsiteManager";
import FriendManager, { SelectedFriend } from "@/components/FriendManager";
import CSSEditor from "@/components/CSSEditor";

export default function SettingsProfile() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [customCSS, setCustomCSS] = useState("");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [featuredFriends, setFeaturedFriends] = useState<SelectedFriend[]>([]);
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
      
      // Parse blogroll as websites
      const blogroll = p.profile?.blogroll;
      if (blogroll && Array.isArray(blogroll)) {
        const parsedWebsites: Website[] = blogroll.map((item: unknown, index: number) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            return {
              id: obj.id as string || index.toString(),
              label: obj.label as string || "",
              url: obj.url as string || "",
              blurb: obj.blurb as string || ""
            };
          }
          return {
            id: index.toString(),
            label: "",
            url: "",
            blurb: ""
          };
        });
        setWebsites(parsedWebsites);
      }

      // Parse featuredFriends
      const featuredFriends = p.profile?.featuredFriends;
      if (Array.isArray(featuredFriends) && featuredFriends.length > 0) {
        const parsedFriends: SelectedFriend[] = featuredFriends.map((item: unknown, index: number) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            return {
              id: obj.id as string || index.toString(),
              handle: obj.handle as string || "",
              displayName: obj.displayName as string || "",
              avatarUrl: obj.avatarUrl as string || "/assets/default-avatar.gif"
            };
          }
          return {
            id: index.toString(),
            handle: "",
            displayName: "",
            avatarUrl: "/assets/default-avatar.gif"
          };
        });
        setFeaturedFriends(parsedFriends);
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) { setMsg("Please log in."); setBusy(false); return; }
      const { token } = await capRes.json();

      // Convert websites back to blogroll format  
      const blogroll = websites.filter(w => w.label.trim() && w.url.trim()).map(w => ({
        id: w.id,
        label: w.label,
        url: w.url,
        blurb: w.blurb || ""
      }));

      // Convert featured friends to stored format
      const featuredFriendsData = featuredFriends.map(f => ({
        id: f.id,
        handle: f.handle,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl
      }));

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          displayName, 
          bio, 
          avatarUrl, 
          customCSS, 
          blogroll, 
          featuredFriends: featuredFriendsData,
          cap: token 
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("Saved!");
    } catch (e: unknown) {
      setMsg((e as Error)?.message || "Failed to save");
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

          <div className="border-t border-gray-300 pt-4">
            <CSSEditor 
              value={customCSS} 
              onChange={setCustomCSS}
            />
          </div>

          <div className="border-t border-gray-300 pt-4">
            <WebsiteManager 
              websites={websites} 
              onChange={setWebsites}
              maxWebsites={10}
            />
          </div>

          <div className="border-t border-gray-300 pt-4">
            <FriendManager 
              selectedFriends={featuredFriends} 
              onChange={setFeaturedFriends}
              maxFriends={8}
            />
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
