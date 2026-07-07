import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/ui/layout/Layout";
import ThreadRingCard from "../../components/core/threadring/ThreadRingCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";
import NoRingsEmptyState from "../../components/features/onboarding/NoRingsEmptyState";
import FeatureGate, { NewUserTooltip } from "../../components/features/onboarding/FeatureGate";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { MetadataGenerator } from "@/lib/utils/metadata/metadata-generator";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface ThreadRingsPageProps {
  siteConfig: SiteConfig;
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

export default function ThreadRingsPage({ siteConfig }: ThreadRingsPageProps) {
  // Generate metadata for ThreadRings page
  const metadataGenerator = new MetadataGenerator(process.env.NEXT_PUBLIC_BASE_URL, siteConfig);
  const threadRingsMetadata = {
    title: 'ThreadRings',
    description: 'Discover and join ThreadRing communities on ThreadStead. Find themed communities organized around shared interests, like modern WebRings or digital clubhouses.',
    keywords: ['threadrings', 'communities', 'webring', 'threadstead', 'social', 'groups'],
    url: '/threadrings',
    type: 'website' as const
  };

  const [threadRings, setThreadRings] = useState<ThreadRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useCurrentUser();

  // Tab state
  const [activeTab, setActiveTab] = useState<'discover' | 'mine'>('discover');

  // Filters
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("trending");
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch ThreadRings
  useEffect(() => {
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
        offset: reset ? "0" : String(threadRings.length),
        sort,
      });

      if (searchQuery) {
        params.set("search", searchQuery);
      }

      // Add membership filter for "My ThreadRings" tab
      if (activeTab === 'mine') {
        params.set("membership", "true");
      }

      const response = await fetch(`/api/threadrings?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch ThreadRings");
      }

      const data = await response.json();
      
      if (reset) {
        setThreadRings(data.threadRings);
        setTotal(data.total);
      } else {
        setThreadRings(prev => [...prev, ...data.threadRings]);
      }
      
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

      // Refresh the list to update membership status
      await fetchThreadRings(true);
      
      // You could show a success message here
      // Success handled by UI refresh
      
    } catch (error: any) {
      console.error("Error joining ThreadRing:", error);
      alert(error.message || "Failed to join ThreadRing");
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchThreadRings(false);
    }
  };

  const sortOptions = [
    { value: "trending", label: "Trending" },
    { value: "newest", label: "Newest" },
    { value: "members", label: "Most Members" },
    { value: "posts", label: "Most Posts" },
    { value: "alphabetical", label: "Alphabetical" }
  ];

  return (
    <>
      <Head>
        <title>{threadRingsMetadata.title} | ThreadStead</title>
        <meta name="description" content={threadRingsMetadata.description} />
        <meta name="keywords" content={threadRingsMetadata.keywords.join(', ')} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${threadRingsMetadata.url}`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={`${threadRingsMetadata.title} | ThreadStead`} />
        <meta property="og:description" content={threadRingsMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${threadRingsMetadata.url}`} />
        <meta property="og:site_name" content="ThreadStead" />
        <meta property="og:locale" content="en_US" />

        {/* Social media card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${threadRingsMetadata.title} | ThreadStead`} />
        <meta name="twitter:description" content={threadRingsMetadata.description} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: threadRingsMetadata.title,
              description: threadRingsMetadata.description,
              url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${threadRingsMetadata.url}`,
              mainEntity: {
                '@type': 'ItemList',
                name: 'ThreadRings',
                description: 'Community-driven ThreadRings on ThreadStead'
              }
            }, null, 0)
          }}
        />
      </Head>

      <Layout siteConfig={siteConfig}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="threadring-hero bg-gradient-to-br from-thread-sunset/10 via-thread-cream to-thread-sky/15 border border-thread-sage rounded-cozy shadow-cozy p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-3xl font-headline font-bold text-thread-pine">ThreadRings</h1>
                <p className="text-thread-sage mt-1">
                  {activeTab === 'mine' ? 'Your ThreadRing memberships' : 'Discover communities and join the conversation'}
                  {total !== null && ` • ${total} total rings`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/threadrings/genealogy"
                  className="btn btn--secondary border border-thread-sage px-3 py-2 text-sm md:px-4 md:text-base bg-thread-paper hover:bg-thread-cream text-thread-pine rounded-cozy shadow-cozySm hover:shadow-cozy transition-all font-medium text-center"
                >
                  🌳 Genealogy
                </Link>
                <Link
                  href="/tr/spool/fork"
                  className="btn btn--primary border border-thread-pine px-3 py-2 text-sm md:px-4 md:text-base bg-thread-sunset text-thread-paper hover:bg-thread-sunset/90 rounded-cozy shadow-cozySm hover:shadow-cozy transition-all font-medium text-center"
                >
                  Branch <span className="hidden md:inline">from The Spool</span>
                </Link>
              </div>
            </div>

          {/* Tabs */}
          <div className="flex border-b border-thread-sage/40 mb-4">
            <button
              onClick={() => setActiveTab('discover')}
              className={`threadring-tab px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'discover'
                  ? 'border-thread-pine text-thread-pine'
                  : 'border-transparent text-thread-sage hover:text-thread-pine hover:border-thread-sage/50'
              }`}
            >
              Discover ThreadRings
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`threadring-tab px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'mine'
                  ? 'border-thread-pine text-thread-pine'
                  : 'border-transparent text-thread-sage hover:text-thread-pine hover:border-thread-sage/50'
              }`}
            >
              My ThreadRings
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder={`Search ${activeTab === 'mine' ? 'my' : ''} ThreadRings...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-thread-sage px-3 py-2 bg-thread-paper rounded-cozy focus:outline-none focus:border-thread-sunset focus:shadow-cozySm transition-all"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full md:w-auto border border-thread-sage px-3 py-2 bg-thread-paper rounded-cozy focus:outline-none focus:border-thread-sunset"
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
        {loading ? (
          <div className="text-center py-8">
            <div className="text-thread-sage animate-pulse">Loading ThreadRings…</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-thread-sunset mb-4">{error}</div>
            <button
              onClick={() => fetchThreadRings(true)}
              className="border border-thread-sage px-4 py-2 bg-thread-paper hover:bg-thread-cream text-thread-pine rounded-cozy shadow-cozySm hover:shadow-cozy transition-all"
            >
              Try Again
            </button>
          </div>
        ) : threadRings.length === 0 ? (
          activeTab === 'mine' && !searchQuery ? (
            // Use playful empty state for "My ThreadRings" when not searching
            <NoRingsEmptyState />
          ) : (
            // Standard empty state for search results or discovery tab
            <div className="text-center py-8">
              <div className="text-thread-sage mb-4">
                {searchQuery ? (
                  activeTab === 'mine' 
                    ? `No ThreadRing memberships found for "${searchQuery}"`
                    : `No ThreadRings found for "${searchQuery}"`
                ) : (
                  activeTab === 'mine'
                    ? "You haven't joined any ThreadRings yet"
                    : "No ThreadRings found"
                )}
              </div>
              {!searchQuery && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {activeTab === 'mine' ? (
                    <button
                      onClick={() => setActiveTab('discover')}
                      className="border border-thread-sage px-4 py-2 bg-thread-sky/25 hover:bg-thread-sky/40 text-thread-pine rounded-cozy shadow-cozySm hover:shadow-cozy transition-all inline-block"
                    >
                      Discover ThreadRings
                    </button>
                  ) : (
                    <FeatureGate 
                      requiresRegularUser 
                      user={user} 
                      fallback={<NewUserTooltip feature="creating rings" />}
                    >
                      <Link
                        href="/tr/spool/fork"
                        className="btn btn--primary border border-thread-pine px-4 py-2 bg-thread-sunset text-thread-paper hover:bg-thread-sunset/90 rounded-cozy shadow-cozySm hover:shadow-cozy transition-all inline-block"
                      >
                        Branch from The Spool
                      </Link>
                    </FeatureGate>
                  )}
                </div>
              )}
            </div>
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
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="border border-thread-sage px-6 py-3 bg-thread-paper hover:bg-thread-cream text-thread-pine rounded-cozy shadow-cozySm hover:shadow-cozy transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};