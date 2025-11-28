// pages/resident/[username]/index.tsx
import React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";

import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import Guestbook from "@/components/shared/Guestbook";
import Tabs, { TabSpec } from "@/components/ui/navigation/Tabs";
import { Website } from "@/components/shared/WebsiteManager";
import { SelectedFriend } from "@/components/core/social/FriendManager";
import ProfileLayout from "@/components/ui/layout/ProfileLayout";
import ProfileHeader from "@/components/core/profile/ProfileHeader";
import BlogTab from "@/components/core/profile/tabs/BlogTab";
import MediaGrid from "@/components/core/profile/tabs/MediaGrid";
import FriendsWebsitesGrid from "@/components/core/profile/tabs/FriendsWebsitesGrid";
import ProfileBadgeDisplay from "@/components/core/profile/ProfileBadgeDisplay";
import ProfileModeRenderer from "@/components/core/profile/ProfileModeRenderer";
import type { ProfileUser } from "@/components/core/profile/ProfileModeRenderer";
import PrivateProfile from "@/components/core/profile/PrivateProfile";
import type { ResidentData } from "@/components/features/templates/ResidentDataProvider";
import type { TemplateNode } from "@/lib/templates/compilation/template-parser";
import { mapProfileCSSModeToComponentMode } from "@/lib/utils/css/css-mode-mapper";
import { detectTemplateType } from "@/lib/utils/template-type-detector";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import { getSiteCSS } from "@/lib/utils/css/site-css-server";
import { generateOptimizedCSS } from "@/lib/utils/css/layers";


// Dynamically import components to avoid SSR issues
const WelcomeHomeOverlay = dynamic(() => import('@/components/features/onboarding/WelcomeHomeOverlay'), {
  ssr: false
});

const MidiPlayer = dynamic(() => import('@/components/ui/media/MidiPlayer'), {
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
  customTemplateAst?: any; // Legacy compatibility
  residentData?: ResidentData;
  hideNavigation?: boolean;
  templateMode?: 'default' | 'enhanced' | 'advanced';
  includeSiteCSS?: boolean;
  cssMode?: 'inherit' | 'override' | 'disable';
  initialSiteCSS?: string; // Pre-fetched site CSS from SSR to prevent hydration mismatches
  preRenderedCSS?: string; // Pre-rendered complete CSS from SSR to prevent hydration mismatches
  // Islands compilation data
  compiledTemplate?: any;
  templateIslands?: any[];
  templateCompiledAt?: string | null;
  profileMidi?: {
    url: string;
    title?: string;
    autoplay?: boolean;
    loop?: boolean;
  };
  // Metadata props
  displayName?: string;
  userJoinedAt?: string;
  // Private profile props
  isPrivateProfile?: boolean;
  privateProfileVisibility?: 'private' | 'followers' | 'friends';
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
  cssMode = 'inherit',
  initialSiteCSS,
  preRenderedCSS,
  compiledTemplate,
  templateIslands,
  templateCompiledAt,
  profileMidi,
  displayName,
  userJoinedAt,
  isPrivateProfile,
  privateProfileVisibility,
}: ProfileProps) {
  // Generate metadata for this profile
  const profileMetadata = contentMetadataGenerator.generateUserProfileMetadata({
    handle: username,
    displayName,
    bio,
    avatarUrl: photoUrl,
    joinedAt: userJoinedAt,
  });
  const router = useRouter();
  const [relStatus, setRelStatus] = React.useState<string>("loading");
  const [showWelcomeHome, setShowWelcomeHome] = React.useState(false);
  const [isFirstVisit, setIsFirstVisit] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [previousVolume, setPreviousVolume] = React.useState(0.7);

  // Check for welcomeHome parameter from signup animation
  React.useEffect(() => {
    if (router.query.welcomeHome === 'true') {
      setShowWelcomeHome(true);
      setIsFirstVisit(true); // Track that this is the first visit
      // Clean up URL without causing re-render
      router.replace(`/resident/${username}`, undefined, { shallow: true });
    }
  }, [router, username]);
  const { user: currentUser } = useCurrentUser();
  const globalAudio = useGlobalAudio();

  const isOwner = currentUser?.id === ownerUserId;

  // If this is a private profile, show the private profile page
  // Note: This check must be after all hooks to comply with React's rules of hooks
  if (isPrivateProfile && privateProfileVisibility) {
    return (
      <PrivateProfile
        username={username}
        displayName={displayName}
        avatarUrl={photoUrl}
        visibility={privateProfileVisibility}
      />
    );
  }

  // Advanced templates always use the advanced renderer for consistent behavior
  // Only non-advanced templates use the standard layout
  const shouldUseStandardLayout = templateMode !== 'advanced';

  // Use advanced renderer for all advanced templates
  if (templateMode === 'advanced' && residentData && !shouldUseStandardLayout) {
    // Create ProfileUser object with Islands data
    const profileUser: ProfileUser = {
      id: ownerUserId,
      handle: username,
      profile: {
        templateMode,
        customCSS,
        customTemplate: null, // Not needed for Islands rendering
        customTemplateAst: customTemplateAst ? JSON.stringify(customTemplateAst) : null,
        cssMode: cssMode,
        compiledTemplate,
        templateIslands,
        templateCompiledAt: templateCompiledAt ? new Date(templateCompiledAt) : null
      }
    };

    // Islands mode: Handle CSS based on navigation and CSS settings
    if (hideNavigation) {
      if (includeSiteCSS) {
        // Detect template type to determine rendering approach
        const compiledTemplateData = compiledTemplate as any;
        const templateType = detectTemplateType(
          compiledTemplateData?.staticHTML,
          customCSS
        );

        // Visual Builder templates MUST render full-screen for WYSIWYG
        // Legacy templates can use constrained layout for backwards compatibility
        if (templateType === 'visual-builder') {
          // Full-screen rendering - no layout constraints
          return (
            <ProfileModeRenderer
              user={profileUser}
              residentData={residentData}
              useIslands={true}
              hideNavigation={true}
              fallbackContent={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  <p>Template failed to load</p>
                </div>
              }
            />
          );
        } else {
          // Legacy template with constrained layout
          const wrapperClass = templateMode === 'advanced'
            ? "min-h-screen flex flex-col"
            : "min-h-screen thread-surface flex flex-col";

          return (
            <div className={wrapperClass}>
              <main className="flex-1 mx-auto max-w-5xl px-6 py-8">
                <ProfileModeRenderer
                  user={profileUser}
                  residentData={residentData}
                  useIslands={true}
                  hideNavigation={true}
                  fallbackContent={
                    <div className="p-8 text-center text-gray-500">
                      <p>Template failed to load</p>
                    </div>
                  }
                />
              </main>
            </div>
          );
        }
      } else {
        // Hide navigation and disable site CSS - no wrapper constraints
        return (
          <ProfileModeRenderer
            user={profileUser}
            residentData={residentData}
            useIslands={true}
            hideNavigation={true}
            fallbackContent={
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                <p>Template failed to load</p>
              </div>
            }
          />
        );
      }
    } else {
      // Show navigation for advanced templates - no wrapper styling, no constraints
      return (
        <ProfileModeRenderer
          user={profileUser}
          residentData={residentData}
          useIslands={true}
          fallbackContent={
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              <p>Template failed to load</p>
            </div>
          }
        />
      );
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
    <>
      <Head>
        <title>{profileMetadata.title}</title>
        <meta name="description" content={profileMetadata.description} />
        {profileMetadata.keywords && (
          <meta name="keywords" content={profileMetadata.keywords.join(', ')} />
        )}
        <meta name="author" content={displayName || username} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${profileMetadata.url}`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={profileMetadata.title} />
        <meta property="og:description" content={profileMetadata.description} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={photoUrl} />
        <meta property="og:image:alt" content={profileMetadata.imageAlt} />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${profileMetadata.url}`} />
        <meta property="og:site_name" content="ThreadStead" />
        <meta property="og:locale" content="en_US" />

        {/* Social media card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={profileMetadata.title} />
        <meta name="twitter:description" content={profileMetadata.description} />
        <meta name="twitter:image" content={photoUrl} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(profileMetadata.structuredData, null, 0)
          }}
        />
      </Head>

      <ProfileLayout
      customCSS={customCSS}
      hideNavigation={hideNavigation}
      includeSiteCSS={includeSiteCSS}
      templateMode={templateMode}
      cssMode={cssMode}
      initialSiteCSS={initialSiteCSS}
      preRenderedCSS={preRenderedCSS}
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

      <div className="profile-tabs-wrapper">
        <Tabs tabs={tabs} initialId={initialTabId} />
      </div>

      {/* MIDI Player - Now using the refactored component with new library */}
      {profileMidi && (
        <MidiPlayer
          midiUrl={profileMidi.url}
          title={profileMidi.title}
          autoplay={profileMidi.autoplay}
          loop={profileMidi.loop}
          compact={false}
        />
      )}

      {/* Global Audio Player - Shows when global audio is playing on first visit only */}
      {globalAudio.state.isPlaying && !profileMidi && isFirstVisit && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border-2 border-black p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isMuted) {
                    // Unmute: restore previous volume
                    globalAudio.setVolume(previousVolume);
                    setIsMuted(false);
                  } else {
                    // Mute: save current volume and set to 0
                    setPreviousVolume(globalAudio.state.volume);
                    globalAudio.setVolume(0);
                    setIsMuted(true);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors"
                aria-label={isMuted ? 'Unmute Music' : 'Mute Music'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium">Welcome Music</div>
                <div className="text-xs text-gray-500">
                  {isMuted ? 'Click to unmute' : 'Click to mute'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Home overlay for new users */}
      {showWelcomeHome && (
        <WelcomeHomeOverlay
          username={username}
          onComplete={() => setShowWelcomeHome(false)}
        />
      )}
    </ProfileLayout>
    </>
  );
}

/* ---------------- SSR: call /api/profile and omit undefined keys ---------------- */
export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params, query, req }) => {
  const usernameParam = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  if (!usernameParam) return { notFound: true };

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/profile/${encodeURIComponent(usernameParam)}`, {
    headers: {
      cookie: req.headers.cookie || '',
    },
  });
  if (res.status === 404) return { notFound: true };

  // Handle private profile - show a custom page instead of 404
  if (res.status === 403) {
    const privateData = await res.json();
    if (privateData.error === 'private_profile') {
      const props: ProfileProps = {
        username: privateData.username || usernameParam,
        ownerUserId: 'private',
        isPrivateProfile: true,
        privateProfileVisibility: privateData.visibility,
        displayName: privateData.displayName,
        photoUrl: privateData.avatarUrl || '/assets/default-avatar.gif',
      };
      return { props };
    }
  }

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

  // Fetch site-wide CSS server-side to prevent hydration mismatches
  const siteWideCSS = await getSiteCSS();
  
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
      cssMode?: 'inherit' | 'override' | 'disable';
      hideNavigation?: boolean;
      includeSiteCSS?: boolean;
      // Islands compilation data
      compiledTemplate?: any;
      templateIslands?: any[];
      templateCompiledAt?: string;
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

  // Read CSS mode directly from database (no more CSS comment parsing!)
  const cssMode = (data.profile?.cssMode as 'inherit' | 'override' | 'disable') || 'inherit';

  // Load custom template data for advanced mode (legacy AST or Islands compilation)
  if (data.profile?.templateMode === 'advanced' &&
      (data.profile?.customTemplateAst || data.profile?.compiledTemplate) &&
      data.profile?.templateEnabled) {
    try {
      // Parse the stored AST (if available - legacy compatibility)
      if (data.profile.customTemplateAst) {
        customTemplateAst = JSON.parse(data.profile.customTemplateAst);
      }
      
      // Migration: Check if AST has img tags but template has Image or UserImage tags (indicates corrupted AST)
      const hasImageComponents = data.profile.customTemplate?.includes('<Image') || data.profile.customTemplate?.includes('<UserImage');
      const astString = customTemplateAst ? JSON.stringify(customTemplateAst) : '';
      const hasImgInAst = astString.includes('"tagName":"img"');
      
      if (customTemplateAst && hasImageComponents && hasImgInAst) {
        // Convert old <Image> tags to <UserImage> for backward compatibility
        const updatedTemplate = data.profile.customTemplate?.replace(/<Image\b/g, '<UserImage').replace(/<\/Image>/g, '</UserImage>');
        
        if (updatedTemplate) {
          // Recompile the template to fix the AST
          const { compileTemplate } = await import('@/lib/templates/compilation/template-parser');
          const compilationResult = compileTemplate(updatedTemplate);
          
          if (compilationResult.success) {
            customTemplateAst = compilationResult.ast!;
          }
        }
      }
      
      // Fetch posts and guestbook data for template rendering using direct DB calls
      const { getSessionUser } = await import('@/lib/auth/server');
      const { getPostsForUser, getGuestbookForUser, getPhotosForUser } = await import('@/lib/utils/data/fetchers');

      const currentUser = await getSessionUser(req as any);
      const viewerId = currentUser?.id;

      // Compute viewer relationship to profile owner
      let isFriend = false;
      let isFollowing = false;
      let isFollower = false;

      if (viewerId && data.userId && viewerId !== data.userId) {
        const { db } = await import('@/lib/config/database/connection');
        const [viewerFollowsOwner, ownerFollowsViewer] = await Promise.all([
          db.follow.findUnique({
            where: { followerId_followeeId: { followerId: viewerId, followeeId: data.userId } },
          }),
          db.follow.findUnique({
            where: { followerId_followeeId: { followerId: data.userId, followeeId: viewerId } },
          })
        ]);

        isFollowing = viewerFollowsOwner?.status === "accepted";
        isFollower = ownerFollowsViewer?.status === "accepted";
        isFriend = isFollowing && isFollower;
      }

      const [postsData, guestbookData, imagesData] = await Promise.allSettled([
        getPostsForUser(usernameParam, viewerId),
        getGuestbookForUser(usernameParam),
        getPhotosForUser(usernameParam, 1, 20)
      ]);
      
      // Handle posts data
      let posts: Array<{ id: string; bodyHtml: string; createdAt: string }> = [];
      if (postsData.status === 'fulfilled' && postsData.value) {

        // Import cleaning functions
        const { markdownToSafeHtml, cleanAndNormalizeHtml } = await import("@/lib/utils/sanitization/html");
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
            bodyHtml: contentHtml,
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
          id: viewerId || null,
          isFriend,
          isFollowing,
          isFollower
        },
        posts,
        guestbook,
        images,
        capabilities: {
          bio: data.profile?.bio || ""
        },
        featuredFriends,
        websites,
        // Map profile CSS mode to component CSS render mode
        cssRenderMode: mapProfileCSSModeToComponentMode(cssMode),
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
  // hideNavigation should only apply to advanced templates, always show navigation in standard mode
  if (data.profile?.hideNavigation != null && data.profile?.templateMode === 'advanced') {
    props.hideNavigation = data.profile.hideNavigation;
  } else {
    props.hideNavigation = false; // Always show navigation for standard/enhanced modes
  }
  if (data.profile?.templateMode != null) props.templateMode = data.profile.templateMode;
  
  
  // Islands compilation data
  if (data.profile?.compiledTemplate != null) {
    props.compiledTemplate = data.profile.compiledTemplate;
  }
  if (data.profile?.templateIslands != null) props.templateIslands = data.profile.templateIslands;
  if (data.profile?.templateCompiledAt != null) props.templateCompiledAt = new Date(data.profile.templateCompiledAt).toISOString();

  // CSS Priority based on template mode and CSS mode
  const templateMode = data.profile?.templateMode || 'default';

  props.cssMode = cssMode;

  // Ensure includeSiteCSS is properly set based on CSS mode
  if (cssMode === 'inherit') {
    // Inherit mode must always load site CSS
    props.includeSiteCSS = true;
  } else if (data.profile?.includeSiteCSS != null) {
    props.includeSiteCSS = data.profile.includeSiteCSS;
  } else {
    // Default to true unless explicitly disabled
    props.includeSiteCSS = true;
  }
  
  if (templateMode === 'enhanced' && data.profile?.customCSS != null && data.profile.customCSS.trim() !== '') {
    // Enhanced mode (Default Layout + Custom CSS) - use user's custom CSS
    props.customCSS = data.profile.customCSS;
  } else if (templateMode === 'default') {
    // Default mode - use admin default CSS only, ignore user CSS
    if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
      props.customCSS = adminDefaultCSS;
    }
  } else if (templateMode === 'advanced' && data.profile?.customCSS != null && data.profile.customCSS.trim() !== '') {
    // Advanced template mode - use raw CSS as-is in head
    props.customCSS = data.profile.customCSS;
  } else if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
    // Fallback to admin default CSS if available
    props.customCSS = adminDefaultCSS;
  }
  // If none of the above, customCSS remains undefined and no CSS is injected
  
  if (websites.length > 0) props.websites = websites;
  if (featuredFriends.length > 0) props.featuredFriends = featuredFriends;
  if (data.profileMidi) props.profileMidi = data.profileMidi;

  // Add metadata props
  if (data.profile?.displayName) props.displayName = data.profile.displayName;
  // Note: We don't have user creation date in the current API response,
  // but we can add it if needed in the future

  // Add site-wide CSS for SSR (prevents hydration mismatch)
  props.initialSiteCSS = siteWideCSS;

  // Generate complete CSS on server to prevent hydration mismatches
  // This ensures server and client render identical CSS
  // Site CSS should only be included if cssMode allows it (not 'disable') AND includeSiteCSS is true
  const shouldIncludeSiteCSS = props.includeSiteCSS && cssMode !== 'disable';
  const preRenderedCSS = generateOptimizedCSS({
    cssMode,
    templateMode,
    siteWideCSS: shouldIncludeSiteCSS ? siteWideCSS : '',
    userCustomCSS: props.customCSS || '',
    profileId: 'profile-layout'
  });
  props.preRenderedCSS = preRenderedCSS;

  return { props };
};
