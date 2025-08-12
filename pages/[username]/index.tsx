// pages/[username]/index.tsx
import React, { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";

import Layout from "../../components/Layout";
import RetroCard from "@/components/RetroCard";
import ProfilePhoto from "@/components/ProfilePhoto";
import Guestbook from "@/components/Guestbook";
import Tabs, { TabSpec } from "@/components/Tabs";
import FollowButton from "@/components/FollowButton";
import FriendBadge from "@/components/FriendBadge";
import MutualFriends from "@/components/MutualFriends";
import type { PluginDescriptor, InstalledPlugin, PluginContext } from "@/types/plugins";
import PostItem, { Post as PostType } from "@/components/PostItem";
import { pluginRegistry } from "@/plugins/registry";
import NewPostForm from "@/components/NewPostForm";
import Link from "next/link";

/* ---------------- helpers ---------------- */
function getBaseUrl(req?: any) {
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  return `${proto}://${host}`;
}

function BlogTab({ username, ownerUserId }: { username: string; ownerUserId: string }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/posts/${encodeURIComponent(username)}`);
    const data = res.ok ? await res.json() : { posts: [] };
    setPosts(Array.isArray(data.posts) ? data.posts : []);
  };

  useEffect(() => { setLoading(true); refresh().finally(() => setLoading(false)); }, [username]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (alive) setIsOwner(me?.loggedIn && me.user?.id === ownerUserId);
    })();
    return () => { alive = false; };
  }, [ownerUserId]);

  if (loading) return <div>Loading posts…</div>;

  return (
    <div className="space-y-3">
      {isOwner && (
        <div className="mb-3">
          <div className="text-sm opacity-70 mb-1">Post as you</div>
          <NewPostForm onPosted={refresh} />
        </div>
      )}
      {posts.length === 0 ? (
        <div className="italic opacity-70">No posts yet.</div>
      ) : (
        posts.map((p) => (
          <PostItem key={p.id} post={p} isOwner={isOwner} onChanged={refresh} />
        ))
      )}
    </div>
  );
}


/* ---------------- types ---------------- */
type ProfileProps = {
  username: string;
  ownerUserId: string; 
  bio?: string;
  about?: string;
  photoUrl?: string;
  customCSS?: string;
  plugins?: PluginDescriptor[];
  initialTabId?: string;
};

/* ---------------- page ---------------- */
export default function ProfilePage({
  username,
  ownerUserId,
  bio,
  about,
  photoUrl = "/assets/default-avatar.gif",
  customCSS,
  plugins = [],
  initialTabId,
}: ProfileProps) {
  const [relStatus, setRelStatus] = React.useState<string>("loading");

  // descriptors (from server) -> runtime plugins (attach loaders via registry)
  const installed: InstalledPlugin[] = plugins.map((d) =>
    d.mode === "trusted" ? { ...d, load: pluginRegistry[d.id] } : d
  );

  // built-in tabs
  const baseTabs: TabSpec[] = [
    { id: "blog", label: "Blog", content: <BlogTab username={username} ownerUserId={ownerUserId} /> },
    // { id: "newPost", label: "New Post", content: <NewPostForm />},
    {
      id: "media",
      label: "Media",
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border border-black bg-white shadow-[2px_2px_0_#000] aspect-square flex items-center justify-center"
            >
              <span className="text-sm">img {i}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "friends",
      label: "Friends / Websites",
      content: (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
            <h4 className="font-bold mb-2">Friends</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><a href="/alice">alice</a></li>
              <li><a href="/bob">bob</a></li>
              <li><a href="/cass">cass</a></li>
            </ul>
          </div>
          <div className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
            <h4 className="font-bold mb-2">Website Recommendations</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><a href="https://example.com" target="_blank" rel="noreferrer">Cool Zines</a></li>
              <li><a href="https://example.com" target="_blank" rel="noreferrer">GIF Museum</a></li>
              <li><a href="https://example.com" target="_blank" rel="noreferrer">Blogroll Ring</a></li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "guestbook",
      label: "Guestbook",
      content: <Guestbook username={username} bio={bio || ""} />,
    },
  ];

  // plugin tabs
  const pluginTabs: TabSpec[] = installed.map((p) => {
    if (p.mode === "trusted" && p.load) {
      const LazyPlugin = React.lazy<React.ComponentType<PluginContext>>(() =>
        p.load!().then((plugin) => ({
          default: plugin.default as React.ComponentType<PluginContext>,
        }))
      );
      return {
        id: p.id,
        label: p.label || p.id,
        content: (
          <React.Suspense fallback={<div>Loading plugin…</div>}>
            <LazyPlugin username={username} />
          </React.Suspense>
        ),
      };
    }
    if (p.mode === "iframe" && p.iframeUrl) {
      return {
        id: p.id,
        label: p.label || p.id,
        content: (
          <iframe
            title={p.label || p.id}
            src={`${p.iframeUrl}?username=${encodeURIComponent(username)}`}
            className="w-full h-[60vh] border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        ),
      };
    }
    return { id: p.id, label: p.label || p.id, content: <div>Plugin unavailable.</div> };
  });

  // const tabs: TabSpec[] = [...baseTabs, ...pluginTabs];
  const tabs: TabSpec[] = baseTabs;

  return (
    <>
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
      <Layout>
        <RetroCard>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
            <ProfilePhoto src={photoUrl} alt={`${username}'s profile photo`} />
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">{username}'s Page</h2>
              {bio}
              {relStatus === "friends" && <FriendBadge />}
              <FollowButton username={username} onStatus={setRelStatus} />
              <MutualFriends username={username} />
              {relStatus === "owner" && (
              <Link
                href="/settings/profile"
                className="border border-black px-3 py-1 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
              >
                Edit profile
              </Link>
            )}
            </div>
          </div>
        </RetroCard>

        <Tabs tabs={tabs} initialId={initialTabId} />
      </Layout>
    </>
  );
}

/* ---------------- SSR: call /api/profile and omit undefined keys ---------------- */
export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params, query, req }) => {
  const usernameParam = String(params?.username || "");
  if (!usernameParam) return { notFound: true };

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/profile/${encodeURIComponent(usernameParam)}`);
  if (res.status === 404) return { notFound: true };

  if (!res.ok) {
    // Fallback: we still must supply ownerUserId, but we don't have it.
    // You can 404 here, but we'll set a dummy and keep page usable.
    const props: ProfileProps = {
      username: usernameParam,
      ownerUserId: "unknown",            // minimal fallback
      bio: "Profile unavailable right now.",
      initialTabId: "blog",
    };
    return { props };
  }

  const data: {
    userId: string;                      // <-- expecting this from /api/profile
    username?: string;
    profile?: { bio?: string; avatarUrl?: string; customCSS?: string };
    plugins?: PluginDescriptor[];
  } = await res.json();

  const requested = typeof query.tab === "string" ? query.tab : undefined;
  const allowedBaseIds = new Set(["blog", "media", "friends", "guestbook"]);
  const initialTabId = requested && allowedBaseIds.has(requested) ? requested : "blog";

  // Build typed props; omit undefined fields
  const props: ProfileProps = {
    username: data.username || usernameParam,
    ownerUserId: data.userId,            // <-- set it
    initialTabId,
  };
  if (data.profile?.bio != null) props.bio = data.profile.bio;
  if (data.profile?.avatarUrl != null) props.photoUrl = data.profile.avatarUrl;
  if (data.profile?.customCSS != null) props.customCSS = data.profile.customCSS;
  if (data.plugins != null) props.plugins = data.plugins;

  return { props };
};
