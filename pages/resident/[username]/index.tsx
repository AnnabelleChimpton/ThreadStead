// pages/resident/[username]/index.tsx
import { getSiteBaseUrl } from '@/lib/config/site-url';
import React from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
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
import type { ProfileUser } from "@/components/core/profile/ProfileModeRenderer";
import type { PageForRender } from "@/lib/templates/rendering/page-tree-server";
import ViewSourceBadge from "@/components/core/profile/ViewSourceBadge";
import StepOutsideLink from "@/components/core/profile/StepOutsideLink";
import PrivateProfile from "@/components/core/profile/PrivateProfile";
import type { PublicWidgetSlot } from "@/lib/domain/profile/widget-slot/compile";
import type { ResidentData } from "@/components/features/templates/ResidentDataProvider";
import { mapProfileCSSModeToComponentMode } from "@/lib/utils/css/css-mode-mapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dynamic from 'next/dynamic';
import { pageUsesAny } from '@/lib/templates/page-home';
import WelcomeMusicControl from "@/components/features/onboarding/WelcomeMusicControl";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import { getSiteCSS } from "@/lib/utils/css/site-css-server";
import { resolveCSSMode } from "@/lib/utils/css/css-mode";
import { pageCSS, siteStylesOn } from "@/lib/domain/profile/layout";
import { usesThemeVars } from "@/lib/templates/appearance";
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";


// The template runtime (every template component) loads only on the pages
// that use it: a page of your own HTML, or a profile with a widget slot.
// Both still render on the server.
const ProfileModeRenderer = dynamic(() => import("@/components/core/profile/ProfileModeRenderer"));
const WidgetSlot = dynamic(() => import("@/components/core/profile/WidgetSlot"));

// Dynamically import components to avoid SSR issues
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
  /** Their banner across the top of the header, and their own status line */
  bannerUrl?: string;
  status?: string;
  customCSS?: string;
  websites?: Website[];
  featuredFriends?: SelectedFriend[];
  initialTabId?: string;
  residentData?: ResidentData;
  hideNavigation?: boolean;
  templateMode?: 'default' | 'enhanced' | 'advanced';
  cssMode?: 'inherit' | 'override' | 'disable';
  initialSiteCSS?: string; // Pre-fetched site CSS from SSR to prevent hydration mismatches
  /** A page of your own HTML, ready to render (lib/templates/rendering/page-tree-server.ts) */
  compiledTemplate?: PageForRender;
  profileMidi?: {
    url: string;
    title?: string;
    /** The owner's credit line for the song */
    credit?: string | null;
    autoplay?: boolean;
    loop?: boolean;
  };
  // Metadata props
  displayName?: string;
  userJoinedAt?: string;
  /** They have a pixel home, and (past the profile's access check) the viewer may see it */
  hasPixelHome?: boolean;
  /** Tabs the owner hid (Settings > Your page); Blog always shows */
  hiddenTabs?: string[];
  /** The widget slot under the header (standard layout only), already compiled */
  widgetSlot?: PublicWidgetSlot;
  /** What the slot's widgets may read about the owner and viewer */
  widgetSlotData?: ResidentData;
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
  bannerUrl,
  status,
  customCSS,
  websites = [],
  featuredFriends = [],
  initialTabId,
  residentData,
  hideNavigation = false,
  templateMode = 'default',
  cssMode = 'inherit',
  initialSiteCSS,
  compiledTemplate,
  profileMidi,
  displayName,
  userJoinedAt,
  hasPixelHome = false,
  widgetSlot,
  widgetSlotData,
  hiddenTabs = [],
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
  const [relStatus, setRelStatus] = React.useState<string>("loading");
  const { user: currentUser } = useCurrentUser();

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

  // The way back out to the house, in the site chrome above every layout
  const stepOutside = hasPixelHome ? <StepOutsideLink username={username} /> : null;

  // Every layout gets the same <head>. A page of your own HTML that came with
  // its own <title> keeps it.
  const documentTitle =
    templateMode === 'advanced' ? compiledTemplate?.ast?.head?.title?.trim() : undefined;
  const pageTitle = documentTitle || profileMetadata.title;
  const head = (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={profileMetadata.description} />
      {profileMetadata.keywords && (
        <meta name="keywords" content={profileMetadata.keywords.join(', ')} />
      )}
      <meta name="author" content={displayName || username} />
      <link rel="canonical" href={`${getSiteBaseUrl()}${profileMetadata.url}`} />
      <meta name="robots" content="index, follow" />

      {/* OpenGraph meta tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={profileMetadata.description} />
      <meta property="og:type" content="profile" />
      <meta key="og:image" property="og:image" content={photoUrl} />
      <meta key="og:image:alt" property="og:image:alt" content={profileMetadata.imageAlt} />
      <meta property="og:url" content={`${getSiteBaseUrl()}${profileMetadata.url}`} />
      <meta property="og:site_name" content="ThreadStead" />
      <meta property="og:locale" content="en_US" />

      {/* Social media card meta tags */}
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={profileMetadata.description} />
      <meta key="twitter:image" name="twitter:image" content={photoUrl} />

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(profileMetadata.structuredData)
        }}
      />
    </Head>
  );

  // The profile's song, floating in the corner as site chrome. On your own
  // HTML page only when it has no <ProfileMusic /> of its own, which plays it
  // in the page instead (a picked song used to be silent there).
  const floatingSong = profileMidi ? (
    <MidiPlayer
      midiUrl={profileMidi.url}
      title={profileMidi.title}
      credit={profileMidi.credit}
      autoplay={profileMidi.autoplay}
      loop={profileMidi.loop}
    />
  ) : null;
  const pagePlaysSong = pageUsesAny(compiledTemplate, ['ProfileMusic']);

  // Your own HTML page. Without residentData (no compiled page, or its data
  // didn't load) an advanced page falls through to the standard layout below.
  if (templateMode === 'advanced' && residentData) {
    // Create ProfileUser object with Islands data
    const profileUser: ProfileUser = {
      id: ownerUserId,
      handle: username,
      profile: {
        templateMode,
        customCSS,
        cssMode: cssMode,
        compiledTemplate,
      }
    };

    // Islands mode: Handle CSS based on navigation and CSS settings
    if (hideNavigation) {
      if (siteStylesOn(cssMode)) {
        return (
          <div className="min-h-screen flex flex-col">
            {head}
            {stepOutside}
            {/* Full bleed: your own page decides its width and margins, as
                it does with navigation shown (this used to box it at 1024px).
                A div, not <main>: the page's own `main {}` rules are for its
                own <main>. */}
            <div className="flex-1">
              <ProfileModeRenderer
                user={profileUser}
                residentData={residentData}
                hideNavigation={true}
                fallbackContent={
                  <div className="p-8 text-center text-gray-500">
                    <p>Template failed to load</p>
                  </div>
                }
                />
              </div>
              <ViewSourceBadge username={username} />
              {!pagePlaysSong && floatingSong}
            </div>
          );
      } else {
        // Hide navigation and disable site CSS - no wrapper constraints
        return (
          <>
            {head}
            <ProfileModeRenderer
              user={profileUser}
              residentData={residentData}
              hideNavigation={true}
              afterNav={stepOutside}
              fallbackContent={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  <p>Template failed to load</p>
                </div>
              }
            />
            <ViewSourceBadge username={username} />
            {!pagePlaysSong && floatingSong}
          </>
        );
      }
    } else {
      // Show navigation for advanced templates - no wrapper styling, no constraints
      return (
        <>
          {head}
          <ProfileModeRenderer
            user={profileUser}
            residentData={residentData}
            afterNav={stepOutside}
            fallbackContent={
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                <p>Template failed to load</p>
              </div>
            }
          />
          <ViewSourceBadge username={username} />
          {!pagePlaysSong && floatingSong}
        </>
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

  const tabs: TabSpec[] = baseTabs.filter((tab) => tab.id === 'blog' || !hiddenTabs.includes(tab.id));

  return (
    <>
      {head}
      <ViewSourceBadge username={username} />
      <ProfileLayout
        hideNavigation={hideNavigation}
        templateMode={templateMode}
        cssMode={cssMode}
        initialSiteCSS={initialSiteCSS}
        afterNav={stepOutside}
        themed={usesThemeVars(customCSS)}
      >
        {/* Signup's welcome music, if it followed the new resident here:
            first in the page so Tab reaches it early */}
        {!profileMidi && <WelcomeMusicControl />}
        <RetroCard>
          <ProfileHeader
            username={username}
            displayName={displayName}
            ownerUserId={ownerUserId}
            photoUrl={photoUrl}
            bio={bio}
            bannerUrl={bannerUrl}
            status={status}
            relStatus={relStatus}
            onRelStatusChange={setRelStatus}
            showPixelHomeLink={hasPixelHome}
          />
        </RetroCard>

        {widgetSlot && widgetSlotData && <WidgetSlot slot={widgetSlot} residentData={widgetSlotData} />}

        <div className="profile-tabs-wrapper">
          <Tabs tabs={tabs} initialId={initialTabId} />
        </div>

        {/* Not when the slot's "My song" widget already plays it in the page */}
        {!widgetSlot?.playsSong && floatingSong}

      </ProfileLayout>
    </>
  );
}

/* ---------------- SSR: call /api/profile and omit undefined keys ---------------- */
export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params, query, req }) => {
  const usernameParam = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  if (!usernameParam) return { notFound: true };

  const base = getInternalBaseUrl();

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
      templateMode?: 'default' | 'enhanced' | 'advanced';
      cssMode?: 'inherit' | 'override' | 'disable';
      hideNavigation?: boolean;
      // Islands compilation data
      compiledTemplate?: any;
      templateCompiledAt?: string;
      blogroll?: unknown[];
      featuredFriends?: unknown[];
      hiddenTabs?: string[];
      bannerUrl?: string | null;
      status?: string | null;
    };
    profileMidi?: {
      url: string;
      title?: string;
      /** The owner's credit line for the song */
      credit?: string | null;
      autoplay?: boolean;
      loop?: boolean;
    };
    hasPixelHome?: boolean;
    widgetSlot?: PublicWidgetSlot | null;
  } = await res.json();

  const requested = typeof query.tab === "string" ? query.tab : undefined;
  const hiddenTabs = Array.isArray(data.profile?.hiddenTabs) ? data.profile.hiddenTabs : [];
  const allowedBaseIds = new Set(["blog", "media", "friends", "badges", "guestbook"].filter((id) => !hiddenTabs.includes(id)));
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
  let residentData: ResidentData | undefined;

  // Shared resolver: server and client MUST resolve identically (this used
  // to diverge between SSR, ProfileLayout, and ProfileModeRenderer).
  const cssMode = resolveCSSMode(data.profile?.cssMode);

  // A page of your own HTML renders from its one compiled copy. A page saved
  // before compiled copies were stored is compiled here from its source
  // (cached by source), the same compile the editor and a save run.
  // The source is read here on the server: the profile API only shows it to
  // the owner.
  let compiledTemplate: unknown = data.profile?.compiledTemplate ?? null;
  if (data.profile?.templateMode === 'advanced' && compiledTemplate == null) {
    const { db } = await import('@/lib/config/database/connection');
    const source = await db.profile.findUnique({ where: { userId: data.userId }, select: { customTemplate: true } });
    if (source?.customTemplate?.trim()) {
      const { compileForEditor } = await import('@/lib/templates/compilation/compile-for-editor');
      const compiled = await compileForEditor(source.customTemplate);
      if (compiled.ok) compiledTemplate = compiled.compiled;
    }
  }

  // A signed-in visitor who said "don't play music automatically for me"
  // gets the song paused, wherever the page plays it. (A signed-out
  // visitor's choice lives in their browser; the player reads it there.)
  if (data.profileMidi?.autoplay) {
    const { getSessionUser } = await import('@/lib/auth/server');
    const visitor = await getSessionUser(req as any);
    if (visitor) {
      const { db } = await import('@/lib/config/database/connection');
      const own = await db.profile
        .findUnique({ where: { userId: visitor.id }, select: { playProfileMusicAutomatically: true } })
        .catch(() => null);
      if (own && !own.playProfileMusicAutomatically) {
        data.profileMidi = { ...data.profileMidi, autoplay: false };
      }
    }
  }

  // Load what the page's components read
  if (data.profile?.templateMode === 'advanced' && compiledTemplate != null) {
    try {
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

        const { postBodyHtml } = await import("@/lib/templates/core/post-body");
        posts = postsData.value.posts?.map((post: any) => ({
          id: post.id || '',
          bodyHtml: postBodyHtml(post),
          createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString()
        })) || [];
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
          isFollower,
          blockedOwner: postsData.status === 'fulfilled' && postsData.value?.blocked === true
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
        // For <ProfileMusic />: the song plays where the page puts it
        ...(data.profileMidi ? { profileMidi: data.profileMidi } : {}),
      };
      // <MyHouse /> <HouseBadge /> <RingNav />: the owner's home, read only when the page uses one
      const { pageHomeIfUsed } = await import('@/lib/templates/page-home');
      const pixelHome = await pageHomeIfUsed(compiledTemplate, data.userId, data.hasPixelHome === true).catch(() => undefined);
      if (pixelHome !== undefined) residentData.pixelHome = pixelHome;
    } catch (error) {
      console.error('Error preparing custom template:', error);
      residentData = undefined;
    }
  }

  // Build typed props; omit undefined fields
  const props: ProfileProps = {
    username: data.username || usernameParam,
    ownerUserId: data.userId,            // <-- set it
    initialTabId,
    hiddenTabs,
  };
  if (data.profile?.bio != null) props.bio = data.profile.bio;
  if (data.profile?.avatarUrl != null) props.photoUrl = data.profile.avatarUrl;
  if (data.profile?.bannerUrl) props.bannerUrl = data.profile.bannerUrl;
  if (data.profile?.status) props.status = data.profile.status;
  if (residentData != null) props.residentData = residentData;
  // hideNavigation should only apply to advanced templates, always show navigation in standard mode
  if (data.profile?.hideNavigation != null && data.profile?.templateMode === 'advanced') {
    props.hideNavigation = data.profile.hideNavigation;
  } else {
    props.hideNavigation = false; // Always show navigation for standard/enhanced modes
  }
  if (data.profile?.templateMode != null) props.templateMode = data.profile.templateMode;


  // A page of your own HTML: the tree it renders from on the server and in
  // the browser, its components, and its <head> bits (title, fonts, <body>
  // colours). Only what rendering reads, not the three stored copies, and
  // only this viewer's side of IfOwner / IfVisitor. Without residentData the
  // tree isn't rendered; it goes out as a visitor's.
  if (data.profile?.templateMode === 'advanced' && compiledTemplate != null) {
    const { pageForRender } = await import('@/lib/templates/rendering/page-tree-server');
    const { viewerIsOwner } = await import('@/components/features/templates/conditional/IfOwner');
    const page = pageForRender(compiledTemplate, {
      isOwner: residentData != null && viewerIsOwner(residentData),
    });
    if (page) props.compiledTemplate = page;
  }

  // The page's CSS: theirs if they have some, else the admin default
  // (lib/domain/profile/layout.ts). Site styles follow cssMode, in _app.
  const templateMode = data.profile?.templateMode || 'default';

  props.cssMode = cssMode;

  const css = pageCSS(data.profile, adminDefaultCSS);
  if (css !== undefined) props.customCSS = css;

  if (websites.length > 0) props.websites = websites;
  if (featuredFriends.length > 0) props.featuredFriends = featuredFriends;
  if (data.profileMidi) props.profileMidi = data.profileMidi;
  props.hasPixelHome = data.hasPixelHome === true;

  // The widget slot belongs to the standard layout; a page of your own HTML
  // has its own place for components.
  if (data.widgetSlot && templateMode !== 'advanced') {
    const { getSessionUser } = await import('@/lib/auth/server');
    const viewer = await getSessionUser(req as any);
    props.widgetSlot = data.widgetSlot;
    props.widgetSlotData = {
      owner: {
        id: data.userId,
        handle: data.username || usernameParam,
        displayName: data.profile?.displayName || data.username || usernameParam,
        avatarUrl: data.profile?.avatarUrl || "/assets/default-avatar.gif",
      },
      viewer: { id: viewer?.id ?? null },
      // Widgets that need posts or pictures can't go in the slot (compile.ts)
      posts: [],
      guestbook: [],
      capabilities: { bio: data.profile?.bio || "" },
      featuredFriends,
      websites,
      cssRenderMode: mapProfileCSSModeToComponentMode(cssMode),
      ...(data.profileMidi ? { profileMidi: data.profileMidi } : {}),
    };
  }

  // Add metadata props
  if (data.profile?.displayName) props.displayName = data.profile.displayName;
  // Note: We don't have user creation date in the current API response,
  // but we can add it if needed in the future

  // Add site-wide CSS for SSR (prevents hydration mismatch)
  props.initialSiteCSS = siteWideCSS;

  return { props };
};
