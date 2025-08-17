// pages/resident/[username]/index.tsx
import React from "react";
import type { GetServerSideProps } from "next";

import RetroCard from "@/components/layout/RetroCard";
import Guestbook from "@/components/Guestbook";
import Tabs, { TabSpec } from "@/components/navigation/Tabs";
import { Website } from "@/components/WebsiteManager";
import { SelectedFriend } from "@/components/FriendManager";
import ProfileLayout from "@/components/layout/ProfileLayout";
import ProfileHeader from "@/components/profile/ProfileHeader";
import BlogTab from "@/components/profile/tabs/BlogTab";
import MediaGrid from "@/components/profile/tabs/MediaGrid";
import FriendsWebsitesGrid from "@/components/profile/tabs/FriendsWebsitesGrid";
import { transformNodeToReact } from "@/lib/template-renderer";
import { ResidentDataProvider } from "@/components/template/ResidentDataProvider";
import type { TemplateNode } from "@/lib/template-parser";
import type { ResidentData } from "@/components/template/ResidentDataProvider";

/* ---------------- helpers ---------------- */


/* ---------------- types ---------------- */
type ProfileProps = {
  username: string;
  ownerUserId: string; 
  bio?: string;
  photoUrl?: string;
  customCSS?: string;
  websites?: Website[];
  featuredFriends?: SelectedFriend[];
  initialTabId?: string;
  customTemplateAst?: TemplateNode;
  residentData?: ResidentData;
  hideNavigation?: boolean;
};

/* ---------------- page ---------------- */
export default function ProfilePage({
  username,
  ownerUserId,
  bio,
  photoUrl = "/assets/default-avatar.gif",
  customCSS,
  websites = [],
  featuredFriends = [],
  initialTabId,
  customTemplateAst,
  residentData,
  hideNavigation = false,
}: ProfileProps) {
  const [relStatus, setRelStatus] = React.useState<string>("loading");

  // If there's a custom template, render it instead of the default layout
  if (customTemplateAst && residentData) {
    try {
      const templateContent = transformNodeToReact(customTemplateAst);
      
      return (
        <ProfileLayout customCSS={customCSS} hideNavigation={hideNavigation}>
          <ResidentDataProvider data={residentData}>
            {templateContent}
          </ResidentDataProvider>
        </ProfileLayout>
      );
    } catch (error) {
      console.error('Error rendering custom template:', error);
      // Fall back to default layout if template fails
    }
  }

  // built-in tabs
  const baseTabs: TabSpec[] = [
    { id: "blog", label: "Blog", content: <BlogTab username={username} ownerUserId={ownerUserId} /> },
    {
      id: "media",
      label: "Media",
      content: <MediaGrid />,
    },
    {
      id: "friends",
      label: "Friends / Websites",
      content: <FriendsWebsitesGrid friends={featuredFriends} websites={websites} />,
    },
    {
      id: "guestbook",
      label: "Guestbook",
      content: (
        <div className="ts-guestbook-tab-content profile-tab-content" data-component="guestbook-tab">
          <Guestbook username={username} bio={bio || ""} />
        </div>
      ),
    },
  ];

  // plugin tabs (unused currently)
  /*
  const _pluginTabs: TabSpec[] = installed.map((p) => {
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
  */

  // const tabs: TabSpec[] = [...baseTabs, ...pluginTabs];
  const tabs: TabSpec[] = baseTabs;

  return (
    <ProfileLayout customCSS={customCSS} hideNavigation={hideNavigation}>
      <RetroCard>
        <ProfileHeader
          username={username}
          photoUrl={photoUrl}
          bio={bio}
          relStatus={relStatus}
          onRelStatusChange={setRelStatus}
        />
      </RetroCard>

      <div className="ts-profile-tabs-wrapper">
        <Tabs tabs={tabs} initialId={initialTabId} />
      </div>
    </ProfileLayout>
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

  // Fetch admin default CSS from public site config
  let adminDefaultCSS = "";
  try {
    const configRes = await fetch(`${base}/api/site-config`);
    if (configRes.ok) {
      const configData = await configRes.json();
      adminDefaultCSS = configData.config?.default_profile_css || "";
    }
  } catch (error) {
    console.error("Failed to fetch admin default CSS:", error);
  }
  
  // If no admin default CSS is set, leave empty to use clean ThreadStead styling
  // (removing automatic fallback to professional template)

  const data: {
    userId: string;                      // <-- expecting this from /api/profile
    username?: string;
    profile?: { 
      bio?: string; 
      avatarUrl?: string; 
      displayName?: string;
      customCSS?: string; 
      customTemplate?: string;
      customTemplateAst?: string;
      templateEnabled?: boolean;
      hideNavigation?: boolean;
      blogroll?: unknown[]; 
      featuredFriends?: unknown[] 
    };
  } = await res.json();

  const requested = typeof query.tab === "string" ? query.tab : undefined;
  const allowedBaseIds = new Set(["blog", "media", "friends", "guestbook"]);
  const initialTabId = requested && allowedBaseIds.has(requested) ? requested : "blog";

  // Convert blogroll to websites
  const websites: Website[] = [];
  if (data.profile?.blogroll && Array.isArray(data.profile.blogroll)) {
    data.profile.blogroll.forEach((item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.label === 'string' && typeof obj.url === 'string') {
          websites.push({
            id: String(obj.id || `website-${websites.length}`),
            label: String(obj.label),
            url: String(obj.url),
            blurb: String(obj.blurb || "")
          });
        }
      }
    });
  }

  // Convert featuredFriends to SelectedFriend[]
  const featuredFriends: SelectedFriend[] = [];
  
  if (Array.isArray(data.profile?.featuredFriends)) {
    data.profile.featuredFriends.forEach((item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.id === 'string' && typeof obj.handle === 'string') {
          featuredFriends.push({
            id: String(obj.id),
            handle: String(obj.handle),
            displayName: String(obj.displayName || obj.handle),
            avatarUrl: String(obj.avatarUrl || "/assets/default-avatar.gif")
          });
        }
      }
    });
  }

  // Handle custom template data
  let customTemplateAst: TemplateNode | undefined;
  let residentData: ResidentData | undefined;

  if (data.profile?.customTemplate && data.profile?.customTemplateAst && data.profile?.templateEnabled) {
    try {
      // Parse the stored AST
      customTemplateAst = JSON.parse(data.profile.customTemplateAst);
      
      // Create resident data from existing profile data
      residentData = {
        owner: {
          id: data.userId,
          handle: data.username || usernameParam,
          displayName: data.profile?.displayName || data.username || usernameParam,
          avatarUrl: data.profile?.avatarUrl || "/assets/default-avatar.gif"
        },
        viewer: {
          id: null // This would need to be populated with current user ID in a real implementation
        },
        posts: [], // These would need separate API calls if needed in templates
        guestbook: [],
        capabilities: {
          bio: data.profile?.bio || ""
        },
        featuredFriends,
        websites,
      };
    } catch (error) {
      console.error('Error preparing custom template:', error);
      customTemplateAst = undefined;
      residentData = undefined;
    }
  }
  
  // Build typed props; omit undefined fields
  const props: ProfileProps = {
    username: data.username || usernameParam,
    ownerUserId: data.userId,            // <-- set it
    initialTabId,
  };
  if (data.profile?.bio != null) props.bio = data.profile.bio;
  if (data.profile?.avatarUrl != null) props.photoUrl = data.profile.avatarUrl;
  if (customTemplateAst != null) props.customTemplateAst = customTemplateAst;
  if (residentData != null) props.residentData = residentData;
  if (data.profile?.hideNavigation != null) props.hideNavigation = data.profile.hideNavigation;
  
  // CSS Priority: User CSS > Admin Default CSS > No CSS
  if (data.profile?.customCSS != null && data.profile.customCSS.trim() !== '') {
    // User has custom CSS - use it
    props.customCSS = data.profile.customCSS;
  } else if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
    // User has no custom CSS but admin has set default CSS - use admin default
    props.customCSS = adminDefaultCSS;
  }
  // If neither, customCSS remains undefined and no CSS is injected
  
  if (websites.length > 0) props.websites = websites;
  if (featuredFriends.length > 0) props.featuredFriends = featuredFriends;

  return { props };
};
