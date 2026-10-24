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
import ResidentHtmlBody from "@/components/core/profile/ResidentHtmlBody";
import type { PageForRender } from "@/lib/templates/rendering/page-tree-server";
import ViewSourceBadge from "@/components/core/profile/ViewSourceBadge";
import StepOutsideLink from "@/components/core/profile/StepOutsideLink";
import PrivateProfile from "@/components/core/profile/PrivateProfile";
import type { PublicWidgetSlot } from "@/lib/domain/profile/widget-slot/compile";
import type { ResidentData } from "@/components/features/templates/ResidentDataProvider";
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

    // The page with what the site puts around it, as the editor's preview renders it
    return (
      <>
        {head}
        <ResidentHtmlBody
          user={profileUser}
          residentData={residentData}
          hideNavigation={hideNavigation}
          siteStyles={siteStylesOn(cssMode)}
          afterNav={stepOutside}
        />
        <ViewSourceBadge username={username} />
        {!pagePlaysSong && floatingSong}
      </>
    );
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

  const [{ getSessionUser }, { loadResidentPage }, { residentDataFor, ownerOnlyData, musicFor, websitesOf, featuredFriendsOf }, { db }] = await Promise.all([
    import('@/lib/auth/server'),
    import('@/lib/domain/profile/load-resident-page'),
    import('@/lib/domain/profile/resident-data'),
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

  const websites = websitesOf(profile);
  const featuredFriends = featuredFriendsOf(profile);
  // Shared resolver: server and client MUST resolve identically (this used
  // to diverge between SSR, ProfileLayout, and ProfileModeRenderer).
  const cssMode = resolveCSSMode(profile?.cssMode);
  const profileMidi = await musicFor(data, viewer);

  // A page of your own HTML: what its components read, built as the
  // editor's preview builds it (lib/domain/profile/resident-data.ts)
  const page = advanced ? data.page : null;
  let residentData: ResidentData | undefined;
  if (advanced) {
    residentData = page
      ? await residentDataFor(data, viewer, { reads: page, profileMidi }).catch((error) => {
          console.error('Error preparing custom template:', error);
          return ownerOnlyData(data);
        })
      : ownerOnlyData(data);
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
    // Widgets that need posts or pictures can't go in the slot (compile.ts)
    props.widgetSlotData = {
      ...ownerOnlyData(data),
      viewer: { id: viewer?.id ?? null },
      featuredFriends,
      websites,
      ...(profileMidi ? { profileMidi } : {}),
    };
  }

  if (profile?.displayName) props.displayName = profile.displayName;

  // Add site-wide CSS for SSR (prevents hydration mismatch)
  props.initialSiteCSS = siteWideCSS;

  return { props };
};
