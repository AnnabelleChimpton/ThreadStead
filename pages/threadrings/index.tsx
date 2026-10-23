import { getSiteBaseUrl } from '@/lib/config/site-url';
import { useState, useEffect } from "react";
import Layout from "../../components/ui/layout/Layout";
import ThreadRingCard from "../../components/core/threadring/ThreadRingCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps, NextApiRequest } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import NoRingsEmptyState from "../../components/features/onboarding/NoRingsEmptyState";
import FeatureGate, { NewUserTooltip } from "../../components/features/onboarding/FeatureGate";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { SITE_TITLE } from "@/lib/config/site/constants";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";
import PageMeta from "@/components/ui/layout/PageMeta";
import Callout from "@/components/ui/feedback/Callout";
import ButtonLink from "@/components/ui/ButtonLink";
import { getSessionUser } from "@/lib/auth/server";

type RingsTab = 'discover' | 'mine';

interface ThreadRingsPageProps {
  siteConfig: SiteConfig;
  /** From ?tab=mine, so "My rings" in the nav is a real link */
  initialTab: RingsTab;
  signedIn: boolean;
}

interface ThreadRing {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: string;
  joinType: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  curator: {
    handle: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  viewerMembership?: {
    role: string;
    joinedAt: string;
  } | null;
  badge?: {
    id: string;
    title: string;
    subtitle?: string | null;
    backgroundColor: string;
    textColor: string;
    templateId?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
  } | null;
  badgeImageUrl?: string | null;
  badgeImageHighResUrl?: string | null;
}

export default function ThreadRingsPage({ siteConfig, initialTab, signedIn }: ThreadRingsPageProps) {
  const router = useRouter();
  const threadRingsMetadata = {
    title: 'ThreadRings',
    description: `Find and join ThreadRings on ${SITE_TITLE}: little groups around a shared interest, like old webrings or a clubhouse.`,
    url: '/threadrings',
  };

  const [threadRings, setThreadRings] = useState<ThreadRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // Where the next page starts in the hub's list (the API can drop blocked rings)
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useCurrentUser();
  const { showError } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<RingsTab>(initialTab);

  // Follow the URL when the nav's "My rings" / "All rings" links change ?tab
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = (tab: RingsTab) => {
    setActiveTab(tab);
    router.replace(tab === 'mine' ? '/threadrings?tab=mine' : '/threadrings', undefined, { shallow: true, scroll: false });
  };

  // Filters
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Signed out, "My rings" asks them to sign in instead
  const showSignIn = activeTab === 'mine' && !signedIn;

  // Fetch ThreadRings
  useEffect(() => {
    if (showSignIn) return;
    fetchThreadRings(true);
  }, [searchQuery, sort, activeTab]);

  const fetchThreadRings = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        limit: "20",
        offset: reset ? "0" : String(nextOffset),
      });

      // Searches come back best match first
      if (searchQuery) {
        params.set("search", searchQuery);
      } else {
        params.set("sort", sort);
      }

      // Add membership filter for "My ThreadRings" tab
      if (activeTab === 'mine') {
        params.set("membership", "true");
      }

      const response = await fetch(`/api/threadrings?${params}`);
      
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.degraded) {
          throw new Error("We can't reach the ThreadRing hub right now. Try again in a minute.");
        }
        throw new Error("Failed to fetch ThreadRings");
      }

      const data = await response.json();
      
      if (reset) {
        setThreadRings(data.threadRings);
        setTotal(data.total);
      } else {
        setThreadRings(prev => [...prev, ...data.threadRings]);
      }

      setNextOffset(data.nextOffset ?? (reset ? 0 : nextOffset) + data.threadRings.length);
      setHasMore(data.hasMore);
    } catch (error: any) {
      console.error("Error fetching ThreadRings:", error);
      setError(error.message || "Failed to load ThreadRings");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleJoin = async (ringSlug: string) => {
    try {
      const response = await csrfFetch(`/api/threadrings/${ringSlug}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join ThreadRing");
      }

      // Show the membership on the card right away
      setThreadRings(prev => prev.map(ring => ring.slug === ringSlug
        ? { ...ring, memberCount: ring.memberCount + 1, viewerMembership: { role: "member", joinedAt: new Date().toISOString() } }
        : ring));
    } catch (error: any) {
      console.error("Error joining ThreadRing:", error);
      showError(error.message || "Failed to join ThreadRing");
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchThreadRings(false);
    }
  };

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "members", label: "Most Members" },
    { value: "alphabetical", label: "Alphabetical" }
  ];

  return (
    <>
      <PageMeta title={threadRingsMetadata.title} description={threadRingsMetadata.description} path={threadRingsMetadata.url}>
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: threadRingsMetadata.title,
              description: threadRingsMetadata.description,
              url: `${getSiteBaseUrl()}${threadRingsMetadata.url}`,
              mainEntity: {
                '@type': 'ItemList',
                name: 'ThreadRings',
                description: `ThreadRings on ${SITE_TITLE}`
              }
            })
          }}
        />
      </PageMeta>

      <Layout siteConfig={siteConfig}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="threadring-hero bg-gradient-to-br from-thread-sunset/10 via-thread-cream to-thread-sky/15 border border-thread-sage rounded-cozy shadow-cozy p-4 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-3xl font-headline font-bold text-thread-pine">ThreadRings</h1>
                <p className="text-thread-sage mt-1">
                  {!showSignIn && activeTab === 'mine' && 'Rings you belong to'}
                  {!showSignIn && activeTab === 'mine' && total !== null && ' · '}
                  {!showSignIn && total !== null && `${total} ${total === 1 ? 'ring' : 'rings'}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/threadrings/genealogy"
                  className="flex-1 sm:flex-none whitespace-nowrap btn btn--secondary border border-thread-sage px-3 py-2 text-sm md:px-4 md:text-base bg-thread-paper hover:bg-thread-cream text-thread-pine rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all font-medium text-center"
                >
                  Family tree
                </Link>
                <Link
                  href={signedIn ? "/tr/spool/fork" : "/login"}
                  className="flex-1 sm:flex-none whitespace-nowrap btn btn--primary border border-thread-pine px-3 py-2 text-sm md:px-4 md:text-base bg-thread-sunset text-thread-paper hover:bg-thread-sunset/90 rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all font-medium text-center"
                >
                  {signedIn ? "Start a ring" : "Sign in to start a ring"}
                </Link>
              </div>
            </div>

          {/* Tabs */}
          <div className="flex border-b border-thread-sage/40 mb-4">
            <button
              onClick={() => selectTab('discover')}
              aria-pressed={activeTab === 'discover'}
              className={`threadring-tab px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'discover'
                  ? 'border-thread-pine text-thread-pine'
                  : 'border-transparent text-thread-sage hover:text-thread-pine hover:border-thread-sage/50'
              }`}
            >
              All rings
            </button>
            <button
              onClick={() => selectTab('mine')}
              aria-pressed={activeTab === 'mine'}
              className={`threadring-tab px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'mine'
                  ? 'border-thread-pine text-thread-pine'
                  : 'border-transparent text-thread-sage hover:text-thread-pine hover:border-thread-sage/50'
              }`}
            >
              My rings
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2 md:gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder={activeTab === 'mine' ? 'Search my rings' : 'Search rings'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-thread-sage px-3 py-2 bg-thread-paper rounded-cozy focus:outline-none focus:border-thread-sunset focus:shadow-cozy-sm transition-all"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              disabled={!!search.trim()}
              aria-label="Sort rings"
              title={search.trim() ? "Searches show the best matches first" : undefined}
              className="flex-1 min-w-0 md:flex-none md:w-auto border border-thread-sage px-3 py-2 bg-thread-paper rounded-cozy focus:outline-none focus:border-thread-sunset"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          </div>
        </div>

        {/* Content */}
        {showSignIn ? (
          <Callout variant="framed" title="Sign in to see your rings">
            <p>The rings you&apos;ve joined show up here.</p>
            <p><ButtonLink href="/login">Sign in</ButtonLink></p>
          </Callout>
        ) : loading ? (
          <LoadingSpinner message="Loading ThreadRings…" className="py-8" />
        ) : error ? (
          <ErrorDisplay title={error} onRetry={() => fetchThreadRings(true)} retryLabel="Try Again" />
        ) : threadRings.length === 0 && !hasMore ? (
          activeTab === 'mine' && !searchQuery ? (
            // Use playful empty state for "My ThreadRings" when not searching
            <NoRingsEmptyState />
          ) : (
            // Standard empty state for search results or discovery tab
            <EmptyState
              title={searchQuery ? (
                activeTab === 'mine'
                  ? `No ThreadRing memberships found for "${searchQuery}"`
                  : `No ThreadRings found for "${searchQuery}"`
              ) : (
                activeTab === 'mine'
                  ? "You haven't joined any ThreadRings yet"
                  : "No ThreadRings found"
              )}
              actions={!searchQuery ? (
                <>
                  {activeTab === 'mine' ? (
                    <button
                      onClick={() => selectTab('discover')}
                      className="border border-thread-sage px-4 py-2 bg-thread-sky/25 hover:bg-thread-sky/40 text-thread-pine rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all inline-block"
                    >
                      All rings
                    </button>
                  ) : (
                    <FeatureGate 
                      requiresRegularUser 
                      user={user} 
                      fallback={<NewUserTooltip feature="creating rings" />}
                    >
                      <Link
                        href="/tr/spool/fork"
                        className="btn btn--primary border border-thread-pine px-4 py-2 bg-thread-sunset text-thread-paper hover:bg-thread-sunset/90 rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all inline-block"
                      >
                        Branch from The Spool
                      </Link>
                    </FeatureGate>
                  )}
                </>
              ) : undefined}
            />
          )
        ) : (
          <>
            {/* ThreadRings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {threadRings.map((ring) => (
                <ThreadRingCard
                  key={ring.id}
                  threadRing={ring}
                  showJoinButton={activeTab === 'discover'}
                  onJoin={handleJoin}
                  signedIn={signedIn}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="border border-thread-sage px-6 py-3 bg-thread-paper hover:bg-thread-cream text-thread-pine rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading…" : "Load More ThreadRings"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const [siteConfig, user] = await Promise.all([
    getSiteConfig(),
    getSessionUser(context.req as NextApiRequest),
  ]);

  return {
    props: {
      siteConfig,
      initialTab: context.query.tab === 'mine' ? 'mine' : 'discover',
      signedIn: !!user,
    },
  };
};