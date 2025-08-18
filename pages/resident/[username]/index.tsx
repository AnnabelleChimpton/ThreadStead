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
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  // Check if current user is the owner
  React.useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn && data.user?.id) {
            setCurrentUserId(data.user.id);
          }
        }
      } catch (error) {
        console.error("Failed to check current user:", error);
      }
    };
    checkCurrentUser();
  }, []);

  const isOwner = currentUserId === ownerUserId;

  // If there's a custom template, render it instead of the default layout
  if (customTemplateAst && residentData) {
    try {
      const templateContent = transformNodeToReact(customTemplateAst);
      
      // Check if this is an advanced template (contains layout components)
      const templateString = JSON.stringify(customTemplateAst);
      const isAdvancedTemplate = templateString.includes('GradientBox') || 
                                templateString.includes('SplitLayout') ||
                                templateString.includes('FlexContainer') ||
                                templateString.includes('CenteredBox');
      
      if (isAdvancedTemplate) {
        // Render advanced templates without layout constraints
        return (
          <>
            {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
            <div className="min-h-screen thread-surface">
              <ResidentDataProvider data={residentData}>
                {templateContent}
              </ResidentDataProvider>
            </div>
          </>
        );
      } else {
        // Use standard profile layout for simple templates
        return (
          <ProfileLayout customCSS={customCSS} hideNavigation={hideNavigation}>
            <ResidentDataProvider data={residentData}>
              {templateContent}
            </ResidentDataProvider>
          </ProfileLayout>
        );
      }
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
      content: <MediaGrid username={username} isOwner={isOwner} />,
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
      
      // Fetch posts and guestbook data for template rendering
      const [postsRes, guestbookRes, imagesRes] = await Promise.allSettled([
        fetch(`${base}/api/posts/${encodeURIComponent(usernameParam)}`),
        fetch(`${base}/api/guestbook/${encodeURIComponent(usernameParam)}`),
        fetch(`${base}/api/photos/${encodeURIComponent(usernameParam)}`)
      ]);
      
      // Handle posts data
      let posts: Array<{ id: string; contentHtml: string; createdAt: string }> = [];
      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const postsData = await postsRes.value.json();

        // Import cleaning functions
        const { markdownToSafeHtml, cleanAndNormalizeHtml } = await import("@/lib/sanitize");
        function escapeHtml(s: string) {
          return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        function textToHtml(text: string) {
          return `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
        }

        posts = postsData.posts?.map((post: any) => {
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
            createdAt: post.createdAt || new Date().toISOString()
          };
        }) || [];
      }
      
      // Handle images data
      let images: Array<{ id: string; url: string; alt: string; caption: string; createdAt: string; }> = [];
      if (imagesRes.status === 'fulfilled' && imagesRes.value.ok) {
        const imagesData = await imagesRes.value.json();
        images = imagesData.media?.filter((img: any) => img.visibility === "public").map((img: any) => ({
          id: img.id || '',
          url: img.fullUrl || img.url || '',
          alt: img.title || img.alt || '',
          caption: img.caption || '',
          createdAt: img.createdAt || new Date().toISOString()
        })) || [];
      }

      // Handle guestbook data
      let guestbook: Array<{ id: string; message: string; authorUsername?: string; createdAt: string }> = [];
      if (guestbookRes.status === 'fulfilled' && guestbookRes.value.ok) {
        const guestbookData = await guestbookRes.value.json();
        guestbook = guestbookData.entries?.map((entry: any) => ({
          id: entry.id || '',
          message: entry.message || '',
          authorUsername: entry.authorUsername || null,
          createdAt: entry.createdAt || new Date().toISOString()
        })) || [];
      }

      console.log('Final images array for template:', images);
      
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
