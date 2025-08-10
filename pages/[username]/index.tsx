// pages/[username]/index.tsx
import React, { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";

import Layout from "../../components/Layout";
import RetroCard from "@/components/RetroCard";
import ProfilePhoto from "@/components/ProfilePhoto";
import Guestbook from "@/components/Guestbook";
import Tabs, { TabSpec } from "@/components/Tabs";

import type { PluginDescriptor, InstalledPlugin, PluginContext } from "@/types/plugins";
import { pluginRegistry } from "@/plugins/registry";

/* ---------------- helpers ---------------- */
function getBaseUrl(req?: any) {
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  return `${proto}://${host}`;
}

function BlogTab({ username }: { username: string }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<
    { id: string; createdAt: string; bodyText?: string; bodyHtml?: string }[]
  >([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/posts/${encodeURIComponent(username)}`);
      if (!alive) return;
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } else {
        setPosts([]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  if (loading) return <div>Loading posts…</div>;
  if (!posts.length) return <div className="italic opacity-70">No posts yet.</div>;

  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <article key={p.id} className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
          <div className="text-xs opacity-70 mb-1">
            {new Date(p.createdAt).toLocaleString()}
          </div>
          {p.bodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: p.bodyHtml }} />
          ) : (
            <p>{p.bodyText}</p>
          )}
        </article>
      ))}
    </div>
  );
}

/* ---------------- types ---------------- */
type ProfileProps = {
  username: string;
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
  bio,
  about,
  photoUrl = "/assets/default-avatar.gif",
  customCSS,
  plugins = [],
  initialTabId,
}: ProfileProps) {
  // descriptors (from server) -> runtime plugins (attach loaders via registry)
  const installed: InstalledPlugin[] = plugins.map((d) =>
    d.mode === "trusted" ? { ...d, load: pluginRegistry[d.id] } : d
  );

  // built-in tabs
  const baseTabs: TabSpec[] = [
    { id: "blog", label: "Blog", content: <BlogTab username={username} /> },
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

  const tabs: TabSpec[] = [...baseTabs, ...pluginTabs];

  return (
    <>
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
      <Layout>
        <RetroCard>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
            <ProfilePhoto src={photoUrl} alt={`${username}'s profile photo`} />
            <div>
              <h2 className="text-2xl font-bold mb-2">{username}'s Page</h2>
              {bio && <p className="mb-2">{bio}</p>}
              {about && <p className="text-sm opacity-80 whitespace-pre-line">{about}</p>}
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
    const props: ProfileProps = {
      username: usernameParam,
      bio: "Profile unavailable right now.",
      initialTabId: "blog",
    };
    return { props };
  }

  const data: {
    username?: string;
    profile?: { bio?: string; avatarUrl?: string; customCSS?: string };
    plugins?: PluginDescriptor[];
  } = await res.json();

  const requested = typeof query.tab === "string" ? query.tab : undefined;
  const allowedBaseIds = new Set(["blog", "media", "friends", "guestbook"]);
  const initialTabId = requested && allowedBaseIds.has(requested) ? requested : "blog";

  // Build typed props and only assign optional fields when they’re non-nullish
  const props: ProfileProps = {
    username: data.username || usernameParam,
    initialTabId,
  };

  if (data.profile?.bio != null) props.bio = data.profile.bio;
  if (data.profile?.avatarUrl != null) props.photoUrl = data.profile.avatarUrl;
  if (data.profile?.customCSS != null) props.customCSS = data.profile.customCSS;
  if (data.plugins != null) props.plugins = data.plugins;

  return { props };
};
