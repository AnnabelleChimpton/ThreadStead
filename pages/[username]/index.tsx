import React from "react";
import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
import Guestbook from "@/components/Guestbook";
import RetroCard from "@/components/RetroCard";
import ProfilePhoto from "@/components/ProfilePhoto";
import Tabs, { TabSpec } from "@/components/Tabs";
import type { PluginDescriptor, InstalledPlugin, PluginContext } from "@/types/plugins";
import { pluginRegistry } from "@/plugins/registry";

type ProfileProps = {
  username: string;
  bio: string;
  customCSS?: string;
  about?: string;
  photoUrl?: string;
  plugins?: PluginDescriptor[];
  initialTabId?: string; // <-- add this
};

export default function ProfilePage({
  username,
  bio,
  customCSS,
  about,
  photoUrl = "/assets/default-avatar.gif",
  plugins = [],
  initialTabId
}: ProfileProps) {
  // Convert descriptors → runtime-installed plugins (attach loaders from registry)
  const installed: InstalledPlugin[] = plugins.map((d) =>
    d.mode === "trusted"
      ? { ...d, load: pluginRegistry[d.id] }
      : d
  );

  // --- Built-in tabs ---
  const baseTabs: TabSpec[] = [
    {
      id: "blog",
      label: "Blog",
      content: (
        <div className="space-y-3">
          <article className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
            <h4 className="font-bold">Hello, Old Web</h4>
            <p>First post! Loving this retro vibe.</p>
          </article>
        </div>
      ),
    },
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
      content: <Guestbook username={username} bio={bio} />,
    },
  ];

  // --- Plugin tabs ---
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
              <p className="mb-2">{bio}</p>
              {about && <p className="text-sm opacity-80 whitespace-pre-line">{about}</p>}
            </div>
          </div>
        </RetroCard>

        <Tabs tabs={tabs} initialId={initialTabId}/>
      </Layout>
    </>
  );
}

// pages/[username]/index.tsx (only showing GSSP + usage)

export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params, query }) => {
  const username = String(params?.username || "guest");
  const bio = `Hi, I'm ${username}! Welcome to my retro page.`;
  const about = "I love old web aesthetics, blogging, and glitter GIFs.\nThis is my personal corner of the web.";
  const photoUrl = "/assets/default-avatar.gif";

  const plugins: PluginDescriptor[] = [
    { id: "com.example.hello", mode: "trusted", label: "Hello" },
  ];

  // Decide the initial tab on the server
  const requested = typeof query.tab === "string" ? query.tab : undefined;
  // Build the base tab IDs you support server-side (must match what you render):
  const allowedBaseIds = new Set(["blog", "media", "friends", "guestbook"]);
  const initialTabId = requested && allowedBaseIds.has(requested) ? requested : "blog";

  return { props: { username, bio, about, photoUrl, plugins, initialTabId } as any };
};
