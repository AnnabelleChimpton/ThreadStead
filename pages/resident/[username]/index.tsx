// pages/resident/[username]/index.tsx
import { getSiteBaseUrl } from '@/lib/config/site-url';
import React from "react";
import type { GetServerSideProps } from "next";
import PageMeta from "@/components/ui/layout/PageMeta";
import type { PageImage } from "@/lib/share-images";

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
import { residentFeedUrl } from "@/lib/feeds/urls";


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
export type ProfileProps = {
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
  /** Their address as their verified Bluesky handle (alice.homepageagain.com) */
  blueskyHandle?: string;
  /** Where the page canonically lives: their address for a public profile */
  canonicalUrl?: string;
  /** Their link preview's picture (lib/share-images/server.ts; public profiles only) */
  shareImage?: PageImage;
  /** Their public posts as RSS (public profiles only) */
  feedUrl?: string;
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
  blueskyHandle,
  canonicalUrl,
  shareImage,
  feedUrl,
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

  // Every layout gets the same <head>. A page of your own HTML with its own
  // <title> puts it first in the tab.
  const documentTitle =
    templateMode === 'advanced' ? compiledTemplate?.ast?.head?.title?.trim() : undefined;
  const pageUrl = canonicalUrl || `${getSiteBaseUrl()}${profileMetadata.url}`;
  const head = (
    <PageMeta
      title={profileMetadata.title}
      tabTitle={documentTitle}
      description={profileMetadata.description}
      path={pageUrl}
      type="profile"
      image={shareImage}
    >
      {feedUrl && (
        <link rel="alternate" type="application/rss+xml" title={`${displayName || username}'s posts`} href={feedUrl} />
      )}
      {/* "This is my site" in the head too, so Mastodon and IndieWeb tools
          find it whichever tab (or template) the page shows */}
      {websites.filter((w) => w.mine && /^https?:\/\//i.test(w.url)).map((w) => (
        <link key={`me-${w.id}`} rel="me" href={w.url} />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(profileMetadata.structuredData)
        }}
      />
    </PageMeta>
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

  // Your own HTML page (residentData is always set for one: ownerOnly in
  // getServerSideProps)
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
    { id: "blog", label: "Blog", content: <BlogTab username={username} ownerUserId={ownerUserId} feedUrl={feedUrl} /> },
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
            blueskyHandle={blueskyHandle}
            profileUrl={pageUrl}
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

/* ---------------- SSR: the resident's page, as this viewer sees it ---------------- */
export const getServerSideProps: GetServerSideProps<ProfileProps> = async ({ params, query, req }) => {
  const usernameParam = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  if (!usernameParam) return { notFound: true };

  const [{ getSessionUser }, { loadResidentPage, pageReads }, { db }] = await Promise.all([
    import('@/lib/auth/server'),
    import('@/lib/domain/profile/load-resident-page'),
    import('@/lib/config/database/connection'),
  ]);

  // Who's looking, once: it was looked up again for the profile, the music,
  // the page's data and the widget slot
  const viewer = await getSessionUser(req as any);
  let lookup: Awaited<ReturnType<typeof loadResidentPage>>;
  try {
    lookup = await loadResidentPage(usernameParam, viewer);
  } catch (error) {
    console.error('Failed to load the profile:', error);
    // Still a page, with its owner unknown, rather than an error
    return { props: { username: usernameParam, ownerUserId: "unknown", bio: "Profile unavailable right now.", initialTabId: "blog" } };
  }
  if (lookup.status === 'not-found') return { notFound: true };

  // A private profile shows its own page instead of a 404
  if (lookup.status === 'private') {
    return {
      props: {
        username: lookup.username,
        ownerUserId: 'private',
        isPrivateProfile: true,
        privateProfileVisibility: lookup.visibility,
        displayName: lookup.displayName,
        photoUrl: lookup.avatarUrl || '/assets/default-avatar.gif',
      },
    };
  }
  const data = lookup.resident;
  const profile = data.profile;
  const username = data.username || usernameParam;
  const advanced = profile?.templateMode === 'advanced';

  const [adminDefault, siteWideCSS] = await Promise.all([
    // The CSS a profile without its own wears (Admin > Site settings)
    db.siteConfig.findUnique({ where: { key: 'default_profile_css' }, select: { value: true } }).catch(() => null),
    // Site-wide CSS server-side to prevent hydration mismatches
    getSiteCSS(),
  ]);

  const requested = typeof query.tab === "string" ? query.tab : undefined;
  const hiddenTabs = Array.isArray(profile?.hiddenTabs) ? profile.hiddenTabs : [];
  const allowedBaseIds = new Set(["blog", "media", "friends", "badges", "guestbook"].filter((id) => !hiddenTabs.includes(id)));
  const initialTabId = requested && allowedBaseIds.has(requested) ? requested : "blog";

  // Convert blogroll to websites
  const websites: Website[] = [];
  if (Array.isArray(profile?.blogroll)) {
    profile.blogroll.forEach((item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.label === 'string' && typeof obj.url === 'string') {
          websites.push({
            id: String(obj.id || `website-${websites.length}`),
            label: String(obj.label),
            url: String(obj.url),
            blurb: String(obj.blurb || ""),
            mine: obj.mine === true
          });
        }
      }
    });
  }

  // Convert featuredFriends to SelectedFriend[]
  const featuredFriends: SelectedFriend[] = [];
  if (Array.isArray(profile?.featuredFriends)) {
    profile.featuredFriends.forEach((item: unknown) => {
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

  // Shared resolver: server and client MUST resolve identically (this used
  // to diverge between SSR, ProfileLayout, and ProfileModeRenderer).
  const cssMode = resolveCSSMode(profile?.cssMode);
  const owner = {
    id: data.userId,
    handle: username,
    displayName: profile?.displayName || username,
    avatarUrl: profile?.avatarUrl || "/assets/default-avatar.gif",
  };

  // A signed-in visitor who said "don't play music automatically for me"
  // gets the song paused, wherever the page plays it. (A signed-out
  // visitor's choice lives in their browser; the player reads it there.)
  let profileMidi = data.profileMidi;
  if (profileMidi?.autoplay && viewer) {
    const own = await db.profile
      .findUnique({ where: { userId: viewer.id }, select: { playProfileMusicAutomatically: true } })
      .catch(() => null);
    if (own && !own.playProfileMusicAutomatically) profileMidi = { ...profileMidi, autoplay: false };
  }

  // A page of your own HTML: what its components read. Who the page belongs
  // to, with nothing else loaded, when its data didn't load or it has no
  // compiled copy: it still renders as itself, its lists empty, or shows its
  // own "couldn't be shown" note. Without it both fell through to the
  // standard layout, still wearing the page's own CSS (template audit 01 #11c/d).
  let residentData: ResidentData | undefined;
  const ownerOnly = (): ResidentData => ({
    owner,
    viewer: { id: null },
    posts: [],
    guestbook: [],
    images: [],
    capabilities: { bio: profile?.bio || "" },
    featuredFriends: [],
    websites: [],
    cssRenderMode: mapProfileCSSModeToComponentMode(cssMode),
  });
  const page = advanced ? data.page : null;
  if (advanced && !page) residentData = ownerOnly();

  if (page) {
    try {
      const { getPostsForUser, getGuestbookForUser, getPhotosForUser } = await import('@/lib/utils/data/fetchers');
      const viewerId = viewer?.id;

      // Compute viewer relationship to profile owner
      let isFriend = false;
      let isFollowing = false;
      let isFollower = false;
      if (viewerId && viewerId !== data.userId) {
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

      // Only the lists the page reads (pageReads)
      const [postsData, guestbookData, imagesData] = await Promise.allSettled([
        pageReads(page, 'posts') ? getPostsForUser(usernameParam, viewerId) : null,
        pageReads(page, 'guestbook') ? getGuestbookForUser(usernameParam) : null,
        pageReads(page, 'images') ? getPhotosForUser(usernameParam, 1, 20) : null,
      ]);

      // Handle posts data
      let posts: ResidentData['posts'] = [];
      if (postsData.status === 'fulfilled' && postsData.value) {
        const { postBodyHtml } = await import("@/lib/templates/core/post-body");
        posts = postsData.value.posts?.map((post: any) => ({
          id: post.id || '',
          // Its title is its link to its own page, and its comments are counted
          title: post.title ?? null,
          commentCount: post.commentCount ?? 0,
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

      residentData = {
        owner,
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
          bio: profile?.bio || ""
        },
        featuredFriends,
        websites,
        // Map profile CSS mode to component CSS render mode
        cssRenderMode: mapProfileCSSModeToComponentMode(cssMode),
        // For <ProfileMusic />: the song plays where the page puts it
        ...(profileMidi ? { profileMidi } : {}),
      };
      // <MyHouse /> <HouseBadge /> <RingNav />: the owner's home, read only when the page uses one
      const { pageHomeIfUsed } = await import('@/lib/templates/page-home');
      const pixelHome = await pageHomeIfUsed(page, data.userId, data.hasPixelHome).catch(() => undefined);
      if (pixelHome !== undefined) residentData.pixelHome = pixelHome;
    } catch (error) {
      console.error('Error preparing custom template:', error);
      residentData = ownerOnly();
    }
  }

  // Build typed props; omit undefined fields
  const props: ProfileProps = {
    username,
    ownerUserId: data.userId,
    initialTabId,
    hiddenTabs,
  };
  if (profile?.bio != null) props.bio = profile.bio;
  if (profile?.avatarUrl != null) props.photoUrl = profile.avatarUrl;
  if (profile?.bannerUrl) props.bannerUrl = profile.bannerUrl;
  if (profile?.status) props.status = profile.status;
  if (residentData != null) props.residentData = residentData;
  // hideNavigation only applies to a page of your own HTML; the standard layout always has the nav
  props.hideNavigation = advanced && profile?.hideNavigation != null ? profile.hideNavigation : false;
  if (profile?.templateMode != null) props.templateMode = profile.templateMode;

  // A page of your own HTML: the tree it renders from on the server and in
  // the browser, its components, and its <head> bits (title, fonts, <body>
  // colours), as this viewer sees it (the loader's pageForRender). Without
  // residentData the tree isn't rendered.
  if (page) props.compiledTemplate = page;

  // The page's CSS: theirs if they have some, else the admin default
  // (lib/domain/profile/layout.ts). Site styles follow cssMode, in _app.
  props.cssMode = cssMode;
  const css = pageCSS(profile, adminDefault?.value || "");
  if (css !== undefined) props.customCSS = css;

  if (websites.length > 0) props.websites = websites;
  if (featuredFriends.length > 0) props.featuredFriends = featuredFriends;
  if (profileMidi) props.profileMidi = profileMidi;
  props.hasPixelHome = data.hasPixelHome;
  // A feed and a link preview reach anyone, signed out: public profiles only
  if (profile?.visibility === 'public') {
    props.feedUrl = residentFeedUrl(username);
    const { residentShareImage } = await import('@/lib/share-images/server');
    const image = await residentShareImage({
      userId: data.userId,
      username,
      name: profile.displayName || `@${username}`,
      hasPixelHome: props.hasPixelHome,
      avatarUrl: profile.avatarUrl,
    }).catch(() => null);
    if (image) props.shareImage = image;
  }
  if (data.blueskyHandle) props.blueskyHandle = data.blueskyHandle;
  if (data.siteUrl) props.canonicalUrl = data.siteUrl;

  // The widget slot belongs to the standard layout; a page of your own HTML
  // has its own place for components.
  if (data.widgetSlot && !advanced) {
    props.widgetSlot = data.widgetSlot;
    props.widgetSlotData = {
      owner,
      viewer: { id: viewer?.id ?? null },
      // Widgets that need posts or pictures can't go in the slot (compile.ts)
      posts: [],
      guestbook: [],
      capabilities: { bio: profile?.bio || "" },
      featuredFriends,
      websites,
      cssRenderMode: mapProfileCSSModeToComponentMode(cssMode),
      ...(profileMidi ? { profileMidi } : {}),
    };
  }

  if (profile?.displayName) props.displayName = profile.displayName;

  // Add site-wide CSS for SSR (prevents hydration mismatch)
  props.initialSiteCSS = siteWideCSS;

  return { props };
};
