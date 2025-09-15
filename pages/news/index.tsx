import React, { useState, useEffect, useCallback } from "react";
import { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import Link from "next/link";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  publishedAt: string;
  type: string;
  priority: number;
  isPublished: boolean;
}

interface NewsPageProps {
  siteConfig: SiteConfig;
  initialNews: NewsItem[];
  hasMore: boolean;
}

interface NewsResponse {
  news: NewsItem[];
  hasMore: boolean;
  total: number;
}

function NewsItem({ item }: { item: NewsItem }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'feature':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-300 bg-white shadow-[2px_2px_0_#000] mb-4">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Link
              href={`/news/${item.id}`}
              className="text-lg font-semibold text-black hover:text-blue-600 transition-colors"
            >
              {item.title}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(item.type)}`}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </span>
              <span className="text-sm text-gray-600">
                {formatDate(item.publishedAt)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-700 text-sm leading-relaxed mb-3">
          {item.summary}
        </p>

        <Link
          href={`/news/${item.id}`}
          className="inline-flex items-center px-3 py-1 text-xs border border-black bg-gray-100 hover:bg-gray-200 shadow-[1px_1px_0_#000] transition-colors"
        >
          Read more →
        </Link>
      </div>
    </div>
  );
}

export default function NewsPage({ siteConfig, initialNews, hasMore: initialHasMore }: NewsPageProps) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const offset = news.length;
      const res = await fetch(`/api/site-news?limit=10&offset=${offset}`);

      if (!res.ok) {
        throw new Error(`Failed to load news: ${res.status}`);
      }

      const data: NewsResponse = await res.json();

      setNews(prev => [...prev, ...data.news]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError((err as Error)?.message || "Failed to load more news");
    } finally {
      setLoading(false);
    }
  }, [news.length, hasMore, loading]);

  return (
    <Layout
      siteConfig={siteConfig}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <RetroCard>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">📢 Site News & Announcements</h1>
            <p className="text-gray-600">
              Stay updated with the latest site news, feature announcements, and important updates.
            </p>
          </div>
        </RetroCard>

        {/* News List */}
        <div className="mt-6">
          {news.length === 0 ? (
            <RetroCard>
              <div className="p-6 text-center">
                <p className="text-gray-600">No news announcements available at this time.</p>
              </div>
            </RetroCard>
          ) : (
            <>
              {news.map((item) => (
                <NewsItem key={item.id} item={item} />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className={`px-6 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Loading...' : 'Load More News'}
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-300 text-red-800 text-center">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<NewsPageProps> = async ({ req }) => {
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  try {
    // Fetch site config
    const siteConfig = await getSiteConfig();

    // Fetch initial news
    const newsRes = await fetch(`${base}/api/site-news?limit=10&offset=0`);
    let initialNews: NewsItem[] = [];
    let hasMore = false;

    if (newsRes.ok) {
      const data: NewsResponse = await newsRes.json();
      initialNews = data.news;
      hasMore = data.hasMore;
    }

    return {
      props: {
        siteConfig,
        initialNews,
        hasMore
      }
    };
  } catch (error) {
    console.error("Error fetching news:", error);

    // Return empty news on error
    const siteConfig = await getSiteConfig();
    return {
      props: {
        siteConfig,
        initialNews: [],
        hasMore: false
      }
    };
  }
};