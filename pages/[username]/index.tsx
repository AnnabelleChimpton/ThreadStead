import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
import Guestbook from "@/components/Guestbook";
import RetroCard from "@/components/RetroCard";
import ProfilePhoto from "@/components/ProfilePhoto";
import Tabs, { TabSpec } from "@/components/Tabs";
import React from "react";
import { InstalledPlugin, PluginContext, PluginDescriptor } from "@/types/plugins";
import { mergeTabs } from "@/components/PluginHost";
import { pluginRegistry } from "@/plugins/registry";

type ProfileProps = {
  username: string;
  bio: string;
  about?: string;
  plugins?: InstalledPlugin[],
  photoUrl?: string;
  customCSS?: string;
};

export default function ProfilePage({
  username,
  bio,
  about,
  photoUrl,
  plugins = [],
  customCSS,
}: ProfileProps) {

// ✅ Define installed here
  const installed: InstalledPlugin[] = plugins.map((d) =>
    d.mode === "trusted"
      ? { ...d, load: pluginRegistry[d.id] }
      : d
  );

  const baseTabs: TabSpec[] = [
    {
      id: "blog",
      label: "Blog",
      content: (
        <div className="space-y-3">
          {/* Replace with real posts later */}
          <article className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
            <h4 className="font-bold">Hello, Old Web</h4>
            <p>First post! Loving this retro vibe.</p>
          </article>
          <article className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
            <h4 className="font-bold">Another Update</h4>
            <p>Tabs are live—blog, media, and friends.</p>
          </article>
        </div>
      ),
    },
    {
      id: "media",
      label: "Media",
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Placeholder images; swap with real media grid later */}
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="border border-black bg-white shadow-[2px_2px_0_#000] aspect-square flex items-center justify-center">
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
        content: (
            <Guestbook username={username} bio={bio} />
        ),
    },
  ];

  // Convert installed plugins → dynamic tab specs
 const pluginTabs: TabSpec[] = installed.map((p) => {
  if (p.mode === "trusted" && p.load) {
    const LazyPlugin = React.lazy<React.ComponentType<PluginContext>>(() =>
      p.load!().then((plugin) => ({ default: plugin.default as React.ComponentType<PluginContext> }))
    );
    return {
      id: p.id,
      label: p.label || p.id,          // <- changed
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
      label: p.label || p.id,          // <- changed
      content: (
        <iframe
          title={p.label || p.id}      // <- changed
          src={`${p.iframeUrl}?username=${encodeURIComponent(username)}`}
          className="w-full h-[60vh] border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      ),
    };
  }
  return { id: p.id, label: p.label || p.id, content: <div>Plugin unavailable.</div> };
});

  const tabs = mergeTabs(baseTabs, pluginTabs);

  return (
    <>
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
      <Layout>
        {/* Header card with photo + bio */}
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

        {/* NEW: Tabs right under the bio */}
        <Tabs tabs={tabs} />

        <RetroCard title="Blogroll">
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="/alice">alice</a></li>
            <li><a href="/bob">bob</a></li>
            <li><a href="/cass">cass</a></li>
          </ul>
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params }) => {
  const username = String(params?.username || "guest");
  const bio = `Hi, I'm ${username}! Welcome to my retro page.`;
  const about = "I love old web aesthetics, blogging, and glitter GIFs.\nThis is my personal corner of the web.";
  const photoUrl = "/assets/duck face.jpg";

  const pluginDescriptors: PluginDescriptor[] = [
    { id: "com.example.hello", mode: "trusted", label: "Hello" },
    // { id: "com.remote.gallery", mode: "iframe", iframeUrl: "https://plugins.example.com/gallery" }
  ];
  return { props: { username, bio, about, photoUrl, plugins: pluginDescriptors } };
};
