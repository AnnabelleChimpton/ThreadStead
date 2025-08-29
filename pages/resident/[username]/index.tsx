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
import ProfileBadgeDisplay from "@/components/ProfileBadgeDisplay";
import { transformNodeToReact } from "@/lib/template-renderer";
import { ResidentDataProvider } from "@/components/template/ResidentDataProvider";
import type { TemplateNode } from "@/lib/template-parser";
import type { ResidentData } from "@/components/template/ResidentDataProvider";
import { featureFlags } from "@/lib/feature-flags";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dynamic from 'next/dynamic';

// Dynamically import MidiPlayer to avoid SSR issues with Tone.js
const MidiPlayer = dynamic(() => import('@/components/MidiPlayer'), { 
  ssr: false,
  loading: () => <div className="hidden" />
});

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
  templateMode?: 'default' | 'enhanced' | 'advanced';
  includeSiteCSS?: boolean;
  profileMidi?: {
    url: string;
    title?: string;
    autoplay?: boolean;
    loop?: boolean;
  };
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
  templateMode = 'default',
  includeSiteCSS = true,
  profileMidi,
}: ProfileProps) {
  const [relStatus, setRelStatus] = React.useState<string>("loading");
  const { user: currentUser } = useCurrentUser();

  const isOwner = currentUser?.id === ownerUserId;

  // Render based on template mode
  if (templateMode === 'advanced' && customTemplateAst && residentData) {
    // Advanced mode with custom template
    try {
      const templateContent = transformNodeToReact(customTemplateAst);
      
      return (
        <>
          <ResidentDataProvider data={residentData}>
            {templateContent}
          </ResidentDataProvider>
        </>
      );
    } catch (error) {
      console.error('Error rendering custom template:', error);
      // Fallback to default layout if template rendering fails
    }
  }
  

  // built-in tabs
  const baseTabs: TabSpec[] = [
    { id: "blog", label: "Blog", content: <BlogTab username={username} ownerUserId={ownerUserId} /> },
    {
      id: "media",
      label: "Media",
      content: <MediaGrid username={username} isOwner={isOwner} />,
    },
    {
      id: "friends",
      label: "Friends / Websites",
      content: <FriendsWebsitesGrid friends={featuredFriends} websites={websites} />,
    },
    {
      id: "badges",
      label: "Badges",
      content: (
        <div className="profile-tab-content p-4">
          <ProfileBadgeDisplay 
            username={username} 
            showTitle={false}
            layout="grid"
            className="max-w-2xl"
          />
        </div>
      ),
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
    <ProfileLayout 
      customCSS={customCSS} 
      hideNavigation={hideNavigation}
      includeSiteCSS={includeSiteCSS}
    >
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

      {/* MIDI Player - Compact floating player */}
      {profileMidi && (
        <MidiPlayer
          midiUrl={profileMidi.url}
          title={profileMidi.title}
          autoplay={profileMidi.autoplay}
          loop={profileMidi.loop}
          compact={true}
        />
      )}
    </ProfileLayout>
  );
}

/* ---------------- SSR: call /api/profile and omit undefined keys ---------------- */
export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params, query, req }) => {
  const usernameParam = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
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
      templateMode?: 'default' | 'enhanced' | 'advanced';
      hideNavigation?: boolean;
      includeSiteCSS?: boolean;
      blogroll?: unknown[]; 
      featuredFriends?: unknown[] 
    };
    profileMidi?: {
      url: string;
      title?: string;
      autoplay?: boolean;
      loop?: boolean;
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

  // Only load custom template in advanced mode
  if (data.profile?.templateMode === 'advanced' && data.profile?.customTemplate && data.profile?.customTemplateAst && data.profile?.templateEnabled) {
    try {
      // Parse the stored AST
      customTemplateAst = JSON.parse(data.profile.customTemplateAst);
      
      // Migration: Check if AST has img tags but template has Image or UserImage tags (indicates corrupted AST)
      const hasImageComponents = data.profile.customTemplate.includes('<Image') || data.profile.customTemplate.includes('<UserImage');
      const astString = JSON.stringify(customTemplateAst);
      const hasImgInAst = astString.includes('"tagName":"img"');
      
      if (hasImageComponents && hasImgInAst) {
        console.log('Detected corrupted AST with img tags instead of UserImage components. Recompiling...');
        // Convert old <Image> tags to <UserImage> for backward compatibility
        const updatedTemplate = data.profile.customTemplate.replace(/<Image\b/g, '<UserImage').replace(/<\/Image>/g, '</UserImage>');
        
        // Recompile the template to fix the AST
        const { compileTemplate } = await import('@/lib/template-parser');
        const compilationResult = compileTemplate(updatedTemplate);
        
        if (compilationResult.success && compilationResult.ast) {
          console.log('Successfully recompiled template with correct AST');
          console.log('AST contains RetroTerminal:', JSON.stringify(compilationResult.ast).includes('"tagName":"retroterminal"'));
          customTemplateAst = compilationResult.ast;
          
          // TODO: Optionally save the corrected AST back to the database
          // This would require an API call to update the user's profile
        } else {
          console.log('Failed to recompile template:', compilationResult.errors);
        }
      }
      
      // Fetch posts and guestbook data for template rendering using direct DB calls
      const { getSessionUser } = await import('@/lib/auth-server');
      const { getPostsForUser, getGuestbookForUser, getPhotosForUser } = await import('@/lib/data-fetchers');
      
      const currentUser = await getSessionUser(req as any);
      const viewerId = currentUser?.id;
      
      const [postsData, guestbookData, imagesData] = await Promise.allSettled([
        getPostsForUser(usernameParam, viewerId),
        getGuestbookForUser(usernameParam),
        getPhotosForUser(usernameParam, 1, 20)
      ]);
      
      // Handle posts data
      let posts: Array<{ id: string; contentHtml: string; createdAt: string }> = [];
      if (postsData.status === 'fulfilled' && postsData.value) {

        // Import cleaning functions
        const { markdownToSafeHtml, cleanAndNormalizeHtml } = await import("@/lib/sanitize");
        function escapeHtml(s: string) {
          return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        function textToHtml(text: string) {
          return `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
        }

        posts = postsData.value.posts?.map((post: any) => {
          let text = "";
          let mode: "markdown" | "html" | "text" = "text";
          if (post.bodyMarkdown) {
            text = post.bodyMarkdown;
            mode = "markdown";
          } else if (post.bodyHtml) {
            text = post.bodyHtml;
            mode = "html";
          } else if (post.bodyText) {
            text = post.bodyText;
            mode = "text";
          }

          let contentHtml = "";
          if (!text.trim()) {
            contentHtml = "<p class='opacity-60'>(Nothing to preview)</p>";
          } else if (mode === "markdown") {
            contentHtml = markdownToSafeHtml(text);
          } else if (mode === "html") {
            contentHtml = cleanAndNormalizeHtml(text);
          } else {
            contentHtml = textToHtml(text);
          }

          return {
            id: post.id || '',
            contentHtml,
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString()
          };
        }) || [];
      }
      
      // Handle images data
      let images: Array<{ id: string; url: string; alt: string; caption: string; createdAt: string; }> = [];
      if (imagesData.status === 'fulfilled' && imagesData.value) {
        images = imagesData.value.media?.map((img: any) => ({
          id: img.id || '',
          url: img.fullUrl || img.url || '',
          alt: img.title || img.alt || '',
          caption: img.caption || '',
          createdAt: img.createdAt ? new Date(img.createdAt).toISOString() : new Date().toISOString()
        })) || [];
      }

      // Handle guestbook data
      let guestbook: Array<{ id: string; message: string; authorUsername?: string; createdAt: string }> = [];
      if (guestbookData.status === 'fulfilled' && guestbookData.value) {
        guestbook = guestbookData.value.entries?.map((entry: any) => ({
          id: entry.id || '',
          message: entry.message || '',
          authorUsername: entry.authorUsername || null,
          createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
        })) || [];
      }
      
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
        posts,
        guestbook,
        images,
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
  if (data.profile?.templateMode != null) props.templateMode = data.profile.templateMode;
  if (data.profile?.includeSiteCSS != null) props.includeSiteCSS = data.profile.includeSiteCSS;
  
  // CSS Priority based on template mode
  const templateMode = data.profile?.templateMode || 'default';
  
  if (templateMode === 'enhanced' && data.profile?.customCSS != null && data.profile.customCSS.trim() !== '') {
    // Enhanced mode (Default Layout + Custom CSS) - use user's custom CSS
    props.customCSS = data.profile.customCSS;
  } else if (templateMode === 'default') {
    // Default mode - use admin default CSS only, ignore user CSS
    if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
      props.customCSS = adminDefaultCSS;
    }
  } else if (templateMode === 'advanced' && data.profile?.customCSS != null && data.profile.customCSS.trim() !== '') {
    // Advanced template mode - use user's custom CSS (legacy compatibility)
    props.customCSS = data.profile.customCSS;
  } else if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
    // Fallback to admin default CSS if available
    props.customCSS = adminDefaultCSS;
  }
  // If none of the above, customCSS remains undefined and no CSS is injected
  
  if (websites.length > 0) props.websites = websites;
  if (featuredFriends.length > 0) props.featuredFriends = featuredFriends;
  if (data.profileMidi) props.profileMidi = data.profileMidi;

  return { props };
};
