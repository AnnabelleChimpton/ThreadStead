import { useRouter } from "next/router";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import PageMeta from "@/components/ui/layout/PageMeta";
import { ringShareImage } from "@/lib/share-images";
import { ringAccentHex } from "@/lib/rings/theme";
import Layout from "../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import PostItem from "../../components/core/content/PostItem";
import ThreadRingFeedScope from "../../components/core/threadring/ThreadRingFeedScope";
import ThreadRingActivePrompt from "../../components/core/threadring/ThreadRingActivePrompt";
import RingHeader from "../../components/core/threadring/RingHeader";
import RingSidebar from "../../components/core/threadring/RingSidebar";
import SpoolLandingPage from "../../components/core/threadring/SpoolLandingPage";
import { useRingViewer } from "../../components/core/threadring/useRingViewer";
import { useRingFeed } from "../../components/core/threadring/useRingFeed";
import { useRingFamily } from "../../components/core/threadring/useRingFamily";
import { loadRingForPage, type RingPageRing } from "@/lib/rings/page-data";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";
import Button from "@/components/ui/Button";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
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

/**
 * The ring page proper: the header card and prompt over the posts, and the
 * sidebar beside them (under them on a phone). Keyed by slug, so moving
 * between rings starts each one fresh.
 */
function RingPage({ siteConfig, ring, cameFrom }: { siteConfig: SiteConfig; ring: RingPageRing; cameFrom: ThreadRingPageProps["cameFrom"] }) {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const viewer = useRingViewer(ring, currentUser);
  const family = useRingFamily(ring.slug);
  const feed = useRingFeed(ring.slug, family.feed?.scopes);
  const [stripOpen, setStripOpen] = useState(false);

  // Settings → Your sites links here with ?strip=<site id> to open the strip builder
  useEffect(() => {
    if (ring.visibility === "public" && typeof router.query.strip === "string") setStripOpen(true);
  }, [ring.visibility, router.query.strip]);

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
  const writeHref = `/post/new?threadRing=${encodeURIComponent(ring.slug)}`;

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

      <Layout siteConfig={siteConfig} fullWidth={true}>
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

        {/* The ring's colour, on its page only (never the site chrome) */}
        <div
          className="tr-page-container grid grid-cols-1 lg:grid-cols-3 gap-6 px-0 sm:px-4 lg:px-6"
          style={{ "--ring-accent": ringAccentHex(ring.themeColor, ring.slug) } as CSSProperties}
        >
          <div className="tr-main-content col-span-1 lg:col-span-2 min-w-0">
            <RingHeader ring={ring} viewer={viewer} signedIn={!!currentUser} />

            <ThreadRingActivePrompt threadRingSlug={ring.slug} isMember={viewer.isMember} />

            <div className="flex items-center justify-between gap-3 mt-2 mb-4 px-4 sm:px-0">
              <h2 className="thread-headline text-xl font-bold !text-nb-ink m-0">Posts</h2>
              {family.feed && (
                <ThreadRingFeedScope withLabel={family.feed.label} scope={feed.scope} onScopeChange={feed.setScope} />
              )}
            </div>

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
                  <div className="tr-posts-list">
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
                  <div className="text-center">
                    <Button variant="secondary" size="sm" className="px-6" onClick={feed.loadMore} disabled={feed.loadingMore}>
                      {feed.loadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}

                {feedUrl && feed.posts.length > 0 && (
                  <p className="tr-feed-link text-sm text-nb-ink-mid mt-5 px-4 sm:px-0">
                    Follow this ring in your feed reader: <a href={feedUrl} className="text-nb-ink">RSS</a>
                  </p>
                )}
              </>
            )}
          </div>

          <RingSidebar ring={ring} viewer={viewer} viewerId={currentUser?.id ?? null} family={family} onGetStrip={() => setStripOpen(true)} />
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
