import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import ThreadRingCard from "../../components/ThreadRingCard";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { featureFlags } from "@/lib/feature-flags";

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
  };
  viewerMembership?: {
    role: string;
    joinedAt: string;
  } | null;
}

export default function ThreadRingsPage({ siteConfig }: ThreadRingsPageProps) {
  const [threadRings, setThreadRings] = useState<ThreadRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

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
  }, [searchQuery, sort]);

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
      const response = await fetch(`/api/threadrings/${ringSlug}/join`, {
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
      console.log(data.message);
      
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
    <Layout siteConfig={siteConfig}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">ThreadRings Directory</h1>
              <p className="text-gray-600 mt-1">
                Discover communities and join the conversation
                {total !== null && ` • ${total} total rings`}
              </p>
            </div>
            <Link
              href="/threadrings/create"
              className="border border-black px-4 py-2 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
            >
              Create ThreadRing
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search ThreadRings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-black px-3 py-2 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-black px-3 py-2 bg-white focus:outline-none"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-600">Loading ThreadRings...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => fetchThreadRings(true)}
              className="border border-black px-4 py-2 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
            >
              Try Again
            </button>
          </div>
        ) : threadRings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 mb-4">
              {searchQuery ? `No ThreadRings found for "${searchQuery}"` : "No ThreadRings found"}
            </div>
            {!searchQuery && (
              <Link
                href="/threadrings/create"
                className="border border-black px-4 py-2 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] inline-block"
              >
                Create the First ThreadRing
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* ThreadRings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {threadRings.map((ring) => (
                <ThreadRingCard
                  key={ring.id}
                  threadRing={ring}
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
                  className="border border-black px-6 py-3 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : "Load More ThreadRings"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (!featureFlags.threadrings()) {
    return {
      notFound: true,
    };
  }

  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};