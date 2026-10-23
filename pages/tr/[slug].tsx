import { getSiteBaseUrl } from '@/lib/config/site-url';
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import PageMeta from "@/components/ui/layout/PageMeta";
import { ringShareImage } from "@/lib/share-images";
import { ringThemeHex } from "@/lib/rings/theme";
import Layout from "../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import PostItem from "../../components/core/content/PostItem";
import ThreadRingFeedScope from "../../components/core/threadring/ThreadRingFeedScope";
import ThreadRingActivePrompt from "../../components/core/threadring/ThreadRingActivePrompt";
import ThreadRing88x31Badge from "../../components/core/threadring/ThreadRing88x31Badge";
import ThreadRingAboutWidget from "../../components/core/threadring/ThreadRingAboutWidget";
import RingSidebar from "../../components/core/threadring/RingSidebar";
import type { LineageData } from "../../components/core/threadring/ThreadRingLineage";
import { useRingViewer } from "../../components/core/threadring/useRingViewer";
import { useRingFeed } from "../../components/core/threadring/useRingFeed";
import { calendarDate } from "@/lib/utils/dates";
import { loadRingForPage, type RingPageRing } from "@/lib/rings/page-data";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import useIsMobile from "../../hooks/useIsMobile";
import WelcomeRingGuide from "../../components/features/onboarding/WelcomeRingGuide";
import { useWelcomeTracking } from "../../hooks/useWelcomeTracking";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import { PixelIcon } from '@/components/ui/PixelIcon';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";
import StripBuilder from "@/components/features/rings/StripBuilder";
import { cameFromSite } from "@/lib/rings/sites";
import { ringFeedUrl } from "@/lib/feeds/urls";

interface ThreadRingPageProps {
  siteConfig: SiteConfig;
  ring: RingPageRing | null;
  /** Why there's no ring: the hub has none for this viewer, or didn't answer in time with none kept */
  unavailable?: "not-found" | "slow" | null;
  /** A member's own site the visitor came from, through its ring strip's badge (?from=). */
  cameFrom?: { id: string; url: string; name: string } | null;
}

// Special component for The Spool landing page
function SpoolLandingPage({ ring, siteConfig }: { ring: RingPageRing; siteConfig: SiteConfig }) {
  const [showSpoolBadgeOptions, setShowSpoolBadgeOptions] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const { user: spoolViewer } = useCurrentUser();
  const { showSuccess } = useToast();
  // From the hub, at render: every ring but the Spool, and the ones branched straight from it
  const totalRings = ring.totalRings ?? 0;
  const directChildren = ring.directChildrenCount ?? 0;

  return (
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <div className="tr-spool-landing max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="tr-spool-hero text-center py-12 mb-12">
          <div className="tr-spool-header mb-6">
            <h1 className="tr-spool-title text-5xl font-bold text-thread-pine mb-4">{ring.name}</h1>
            <p className="tr-spool-description text-xl text-thread-sage max-w-2xl mx-auto leading-relaxed mb-6">
              {ring.description}
            </p>

            {/* Prominent Spool Badge */}
            {ring.badge && ring.badge.isActive && (
              <div className="tr-spool-badge-container thread-module max-w-md mx-auto">
                <div className="tr-spool-badge-content text-center">
                  <div className="flex justify-center mb-3">
                    <div
                      onClick={() => setShowSpoolBadgeOptions(!showSpoolBadgeOptions)}
                      className="cursor-pointer"
                      title="Click to show copy options"
                    >
                      <ThreadRing88x31Badge
                        templateId={ring.badge.templateId ?? undefined}
                        title={ring.badge.title}
                        subtitle={ring.badge.subtitle ?? undefined}
                        backgroundColor={ring.badge.backgroundColor}
                        textColor={ring.badge.textColor}
                        imageUrl={ring.badge.imageUrl ?? undefined}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-thread-pine mb-2 flex items-center justify-center gap-1"><PixelIcon name="map" size={16} /> The Spool Official Badge</div>
                  <p className="text-xs text-thread-sage mb-3">
                    {showSpoolBadgeOptions ?
                      "The genesis badge representing the root of all ThreadRing communities" :
                      "Click the badge for a strip and a link for your website"
                    }
                  </p>

                  {showSpoolBadgeOptions ? (
                    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 mb-3">
                      <div className="flex justify-center gap-2 mb-2">
                        {ring.visibility === "public" && (
                          <Button
                            variant="secondary"
                            onClick={() => setStripOpen(true)}
                            className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                          >
                            <PixelIcon name="clipboard" size={12} /> Get a strip
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(`${getSiteBaseUrl()}/tr/${ring.slug}`);
                            showSuccess('Link copied.');
                          }}
                          className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                        >
                          <PixelIcon name="link" size={12} /> Copy Link
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setShowSpoolBadgeOptions(false)}
                          className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                        >
                          <PixelIcon name="close" size={12} /> Close
                        </Button>
                      </div>
                      <p className="text-xs text-thread-sage">
                        Share The Spool&apos;s genesis badge on your website
                      </p>
                      <StripBuilder isOpen={stripOpen} onClose={() => setStripOpen(false)} ring={ring} signedIn={!!spoolViewer} />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="tr-spool-stats grid md:grid-cols-2 gap-6 mb-12">
          <div className="thread-module text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">{totalRings}</div>
            <div className="text-thread-sage font-medium">Total Communities</div>
            <div className="text-sm text-thread-sage mt-1">
              Every ring under The Spool
            </div>
          </div>

          <div className="thread-module text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">{directChildren}</div>
            <div className="text-thread-sage font-medium">Direct Descendants</div>
            <div className="text-sm text-thread-sage mt-1">
              Communities born from The Spool
            </div>
          </div>
        </div>

        {/* Host's note / welcome message */}
        {ring.curatorNote && (
          <div className="border-l-4 border-nb-lav pl-4 py-2 mb-12">
            <div className="flex items-start">
              <div>
                <p className="font-medium text-nb-ink mb-2">Welcome to The Spool</p>
                <p className="text-nb-ink leading-relaxed">
                  {ring.curatorNote}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Genealogy Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Genealogy Explorer */}
          <div className="thread-module">
            <h2 className="thread-headline text-2xl font-bold mb-4">Genealogy Explorer
            </h2>
            <p className="text-thread-sage mb-6">
              Explore the complete family tree of all ThreadRing communities. See how every ring traces its lineage back to The Spool.
            </p>

            <Link
              href="/threadrings/genealogy"
              className="thread-button btn btn--primary w-full flex items-center justify-center gap-2"
            >
              Explore Family Tree
            </Link>
          </div>

          {/* Community Discovery */}
          <div className="thread-module">
            <h2 className="thread-headline text-2xl font-bold mb-4">Discover Communities
            </h2>
            <p className="text-thread-sage mb-6">
              Browse all ThreadRing communities that have grown from The Spool. Find your people and join the conversation.
            </p>

            <div className="space-y-3">
              <ButtonLink
                href="/threadrings"
                variant="secondary"
                className="thread-button-secondary w-full text-center"
              >
                <PixelIcon name="gps" size={16} className="inline-block align-[-3px] mr-1.5" />Discover Communities
              </ButtonLink>

              <ButtonLink
                href="/tr/spool/fork"
                className="thread-button w-full text-center"
              >
                <PixelIcon name="plus" size={16} className="inline-block align-[-3px] mr-1.5" />Create New Community
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* About The Spool */}
        <div className="thread-module mb-12">
          <h2 className="text-2xl font-bold text-thread-pine mb-4 text-center">
            About The Spool
          </h2>
          <div className="max-w-3xl mx-auto text-thread-sage leading-relaxed space-y-4">
            <p>
              The Spool represents the symbolic origin of all ThreadRing communities. Unlike regular ThreadRings,
              The Spool doesn&apos;t host posts or have traditional members - instead, it serves as the genealogical
              root that connects every community in a unified family tree.
            </p>
            <p>
              Every ThreadRing community, whether created directly or forked from another, can trace its lineage
              back to The Spool. This creates a rich genealogy that shows how communities evolve, split, and grow
              over time.
            </p>
            <p>
              Think of The Spool as the trunk of a vast tree, with every ThreadRing as a branch that grows in its
              own direction while staying connected to the whole.
            </p>
          </div>
        </div>

        <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 text-sm text-nb-ink">
          <ul className="space-y-1">
            <li>• Created: {calendarDate(ring.createdAt)}</li>
            <li>• Direct Descendants: {directChildren}</li>
            <li>• Total Descendants: {totalRings}</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

/** The ring page proper. Keyed by slug, so moving between rings starts each one fresh. */
function RingPage({ siteConfig, ring, cameFrom }: { siteConfig: SiteConfig; ring: RingPageRing; cameFrom: ThreadRingPageProps["cameFrom"] }) {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  useWelcomeTracking();
  const viewer = useRingViewer(ring, currentUser);
  const feed = useRingFeed(ring.slug);
  const [lineage, setLineage] = useState<LineageData | null>(null);
  const [stripOpen, setStripOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isPhone = useIsMobile(1024);

  // Settings → Your sites links here with ?strip=<site id> to open the strip builder
  useEffect(() => {
    if (ring.visibility === "public" && typeof router.query.strip === "string") setStripOpen(true);
  }, [ring.visibility, router.query.strip]);

  // One lineage read for the feed's scopes and the Tree tab
  useEffect(() => {
    let cancelled = false;
    const none: LineageData = { ancestors: [], descendants: [], parents: [], children: [], directChildrenCount: 0, totalDescendantsCount: 0, siblingsCount: 0, lineageDepth: 0, lineagePath: "" };
    fetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/lineage`)
      .then((response) => (response.ok ? response.json() : none))
      .catch(() => none)
      .then((data) => {
        if (!cancelled) setLineage(data);
      });
    return () => {
      cancelled = true;
    };
  }, [ring.slug]);

  // The phone's ring info sheet holds the page still while it's open, and closes on a wider screen
  useEffect(() => {
    if (!isPhone) setSheetOpen(false);
  }, [isPhone]);
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const isPublic = ring.visibility === "public";
  const ringMetadata = contentMetadataGenerator.generateThreadRingMetadata({
    slug: ring.slug,
    name: ring.name,
    description: ring.description ?? undefined,
    curatorNote: ring.curatorNote ?? undefined,
    memberCount: ring.memberCount,
    postCount: ring.postCount,
    visibility: ring.visibility,
    curator: ring.host ? { handle: ring.host.username, displayName: ring.host.displayName ?? undefined } : undefined,
    createdAt: ring.createdAt,
  });
  const feedUrl = isPublic ? ringFeedUrl(ring.slug) : undefined;
  const themeHex = ringThemeHex(ring.themeColor);
  const directChildren = lineage?.directChildrenCount ?? ring.directChildrenCount ?? 0;
  const siblings = lineage?.siblingsCount ?? 0;
  const writeHref = `/post/new?threadRing=${encodeURIComponent(ring.slug)}`;
  const sidebar = (inSheet: boolean) => (
    <RingSidebar
      ring={ring}
      viewer={viewer}
      signedIn={!!currentUser}
      lineage={lineage}
      onGetStrip={() => setStripOpen(true)}
      showAbout={!inSheet}
    />
  );

  return (
    <>
      <PageMeta
        title={ringMetadata.title}
        description={ringMetadata.description}
        path={ringMetadata.url}
        image={ringShareImage({ slug: ring.slug, name: ring.name, badgeImageUrl: ring.badge?.imageUrl })}
        noIndex={!isPublic}
      >
        {feedUrl && (
          <link rel="alternate" type="application/rss+xml" title={`${ring.name} ring posts`} href={feedUrl} />
        )}
        {isPublic && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(ringMetadata.structuredData)
            }}
          />
        )}
      </PageMeta>

      {/* The ring's own accent, on its page only (never the site chrome) */}
      {themeHex && (
        <style jsx global>{`
          .tr-page-container .text-thread-pine {
            color: ${themeHex} !important;
          }
          .tr-page-container .bg-thread-pine {
            background-color: ${themeHex} !important;
          }
          .tr-page-container .border-thread-pine {
            border-color: ${themeHex} !important;
          }
        `}</style>
      )}

      <Layout siteConfig={siteConfig} fullWidth={true}>
        {/* Welcome Ring Guide - shows only on welcome ring */}
        {ring.slug === 'welcome' && (
          <WelcomeRingGuide
            ringSlug={ring.slug}
            viewer={currentUser}
            ring={{ curator: viewer.role === "curator" && currentUser ? { id: currentUser.id } : null }}
          />
        )}

        {cameFrom && (
          <div className="mx-0 sm:mx-4 lg:mx-6 mb-4 px-4 py-2 bg-thread-paper border border-thread-sage/40 rounded-cozy text-sm text-nb-ink flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              You came from{' '}
              <a href={cameFrom.url} rel="ugc" className="font-semibold underline">{cameFrom.name}</a>
            </span>
            <span aria-hidden="true">·</span>
            <a href={cameFrom.url} rel="ugc" className="underline">back to it</a>
            <span aria-hidden="true">·</span>
            <a href={`/ring/${encodeURIComponent(ring.slug)}/next?from=${encodeURIComponent(cameFrom.id)}`} className="underline">keep walking →</a>
          </div>
        )}

        <div className="tr-page-container grid grid-cols-1 lg:grid-cols-3 gap-6 px-0 sm:px-4 lg:px-6">
          {/* Main content area - posts feed */}
          <div className="tr-main-content col-span-1 lg:col-span-2">
            <div className="tr-header-card bg-thread-paper rounded-cozy shadow-cozy border border-thread-sage/30 overflow-hidden">
              {ring.bannerUrl && (
                <div className="w-full h-32 sm:h-48 relative bg-thread-cream border-b border-thread-sage/20">
                  <img
                    src={ring.bannerUrl}
                    alt={`${ring.name} banner`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 sm:p-6 border-b border-thread-sage/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="tr-title text-3xl sm:text-4xl font-bold text-thread-pine min-w-0" title={ring.name}>
                    {ring.name}
                  </h1>
                  {ring.badge && ring.badge.isActive && (
                    <div className="flex-shrink-0">
                      <ThreadRing88x31Badge
                        templateId={ring.badge.templateId ?? undefined}
                        title={ring.badge.title}
                        subtitle={ring.badge.subtitle ?? undefined}
                        backgroundColor={ring.badge.backgroundColor}
                        textColor={ring.badge.textColor}
                        imageUrl={ring.badge.imageUrl ?? undefined}
                      />
                    </div>
                  )}
                </div>

                <div className="tr-meta-info flex flex-wrap items-center gap-3 text-sm text-nb-ink-mid">
                  {ring.host && (
                    <>
                      <span className="tr-curator-info font-medium">
                        Hosted by <Link href={`/resident/${encodeURIComponent(ring.host.username)}`}>{ring.host.displayName || `@${ring.host.username}`}</Link>
                      </span>
                      <span className="text-nb-ink-mid">•</span>
                    </>
                  )}
                  <span className="tr-member-count">{viewer.memberCount} member{viewer.memberCount !== 1 ? 's' : ''}</span>
                  <span className="text-nb-ink-mid">•</span>
                  <span className="tr-post-count">{ring.postCount} post{ring.postCount !== 1 ? 's' : ''}</span>
                  <span className="text-nb-ink-mid">•</span>
                  <span className="tr-join-type capitalize">{ring.joinType} joining</span>
                </div>
              </div>

              <div className="tr-footer px-3 sm:px-6 py-3 border-t-2 border-dotted border-nb-ink-mid/30">
                <span className="tr-slug text-xs text-nb-ink-mid font-mono">threadring/{ring.slug}</span>
              </div>
            </div>

            {/* Phones: what the ring is about first, and the rest of the sidebar one tap away */}
            <div className="lg:hidden mt-6 space-y-3">
              <ThreadRingAboutWidget description={ring.description} curatorNote={ring.curatorNote} />
              <Button
                variant="secondary"
                onClick={() => setSheetOpen(true)}
                className="thread-button-secondary w-full flex items-center justify-center gap-2"
                aria-expanded={sheetOpen}
              >
                <PixelIcon name="info-box" size={16} /> Ring info
              </Button>
            </div>

            {/* Active Prompt/Challenge */}
            <div className="mt-6">
              <ThreadRingActivePrompt
                threadRingSlug={ring.slug}
                isMember={viewer.isMember}
              />
            </div>

            {/* Feed Scope Selector */}
            {(ring.parentId || directChildren > 0 || siblings > 0) && (
              <div className="mt-6">
                <ThreadRingFeedScope
                  hasParent={!!ring.parentId}
                  hasChildren={directChildren > 0}
                  hasSiblings={siblings > 0}
                  currentScope={feed.scope}
                  onScopeChange={feed.setScope}
                />
              </div>
            )}

            {viewer.isMember && (
              <div className="mt-6 lg:hidden">
                <ButtonLink href={writeHref} className="thread-button w-full block text-center">
                  <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />Write in this ring
                </ButtonLink>
              </div>
            )}

            <div className="mt-6">
              {feed.loading ? (
                <LoadingSpinner message="Loading posts..." className="tr-posts-loading py-8 px-3" />
              ) : feed.error ? (
                <ErrorDisplay title={feed.error} className="tr-posts-error" />
              ) : (
                <>
                  {feed.posts.length === 0 ? (
                    <EmptyState
                      variant="plain"
                      className="tr-posts-empty py-12 px-3"
                      title={feed.hasMore ? "No posts to show here yet" : "No posts yet"}
                      description={feed.hasMore ? undefined : viewer.isMember ? (
                        <Link href={writeHref}>Write the first one</Link>
                      ) : (
                        "Posts from members will appear here"
                      )}
                    />
                  ) : (
                    <div className="tr-posts-list space-y-6">
                      {feed.posts.map((post) => (
                        <PostItem
                          key={post.id}
                          post={post}
                          isOwner={currentUser?.id === post.author?.id}
                          onChanged={(change) => feed.postChanged(post.id, change)}
                          threadRingContext={{ slug: ring.slug, name: ring.name }}
                          canModerateRing={viewer.canModerate}
                          currentUser={currentUser}
                          viewContext="ring"
                        />
                      ))}
                    </div>
                  )}

                  {feed.hasMore && (
                    <div className="text-center pt-6 mt-6">
                      <button
                        className="bg-thread-paper border border-thread-sage/30 px-6 py-2 rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all text-sm font-medium"
                        onClick={feed.loadMore}
                        disabled={feed.loadingMore}
                      >
                        {feed.loadingMore ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}

                  {feedUrl && feed.posts.length > 0 && (
                    <p className="tr-feed-link text-sm opacity-80 mt-6">
                      Follow this ring in your feed reader: <a href={feedUrl} className="underline">RSS</a>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {!isPhone && (
            <div className="tr-sidebar hidden lg:block lg:col-span-1">
              {sidebar(false)}
            </div>
          )}
        </div>

        {isPublic && (
          <StripBuilder
            isOpen={stripOpen}
            onClose={() => setStripOpen(false)}
            ring={ring}
            signedIn={!!currentUser}
            initialSiteId={typeof router.query.strip === "string" ? router.query.strip : null}
          />
        )}

        {isPhone && (
          <>
            <div
              className={`bottom-sheet-backdrop ${sheetOpen ? 'visible' : ''}`}
              onClick={() => setSheetOpen(false)}
              aria-hidden="true"
            />
            <div className={`mobile-bottom-sheet ${sheetOpen ? 'open' : ''}`} role="dialog" aria-label="Ring info" aria-hidden={!sheetOpen}>
              <div className="bottom-sheet-handle" />
              <div className="bottom-sheet-content">
                <div className="p-4 pb-6 bottom-sheet-safe-area">
                  <div className="flex justify-end mb-3">
                    <Button variant="secondary" size="sm" onClick={() => setSheetOpen(false)} className="flex items-center gap-1">
                      <PixelIcon name="close" size={14} /> Close
                    </Button>
                  </div>
                  {sheetOpen && sidebar(true)}
                </div>
              </div>
            </div>
          </>
        )}
      </Layout>
    </>
  );
}

export default function ThreadRingPage({ siteConfig, ring, unavailable = null, cameFrom = null }: ThreadRingPageProps) {
  if (!ring) {
    const slow = unavailable === "slow";
    return (
      <>
        <PageMeta title={slow ? "Ring Hub is slow" : "Ring not found"} noIndex />
        <Layout siteConfig={siteConfig} fullWidth={true}>
          <div className="max-w-2xl mx-auto py-8 px-4">
            {slow ? (
              <ErrorDisplay
                variant="notice"
                title="Ring Hub is slow right now"
                message="Rings live on Ring Hub, and it didn't answer in time. Try again in a minute."
                actionLabel="Browse rings"
                actionHref="/threadrings"
              />
            ) : (
              <ErrorDisplay title="Ring not found" actionLabel="Browse rings" actionHref="/threadrings" />
            )}
          </div>
        </Layout>
      </>
    );
  }

  if (ring.isSystemRing) {
    const metadata = contentMetadataGenerator.generateThreadRingMetadata({
      slug: ring.slug,
      name: ring.name,
      description: ring.description ?? undefined,
      visibility: ring.visibility,
    });
    return (
      <>
        <PageMeta title={ring.name} description={metadata.description} path={`/tr/${ring.slug}`} />
        <SpoolLandingPage ring={ring} siteConfig={siteConfig} />
      </>
    );
  }

  return <RingPage key={ring.slug} siteConfig={siteConfig} ring={ring} cameFrom={cameFrom} />;
}

export const getServerSideProps: GetServerSideProps<ThreadRingPageProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const { slug } = context.params!;
  if (typeof slug !== "string") {
    context.res.statusCode = 404;
    return { props: { siteConfig, ring: null, unavailable: "not-found" } };
  }

  // Signed as the viewer when there is one, so a private ring's members see it
  const viewer = await getSessionUser(context.req as any).catch(() => null);
  const load = await loadRingForPage(slug, viewer?.id ?? null);
  if (load.status !== "ok") {
    context.res.statusCode = load.status === "slow" ? 503 : 404;
    return { props: { siteConfig, ring: null, unavailable: load.status } };
  }

  // Next can't send undefined
  const ring = JSON.parse(JSON.stringify(load.ring, (_key, value) => (value === undefined ? null : value)));

  // Arrived through a member's ring strip
  const cameFrom = ring.visibility === "public" && context.query.from
    ? await cameFromSite(db, ring.slug, context.query.from).catch(() => null)
    : null;

  return { props: { siteConfig, ring, cameFrom } };
};
