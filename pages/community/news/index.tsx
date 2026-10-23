import React, { useState, useEffect, useCallback } from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import CommunityHeader from "@/components/ui/navigation/CommunityHeader";
import Callout from "@/components/ui/feedback/Callout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import Link from "next/link";
import PageMeta from "@/components/ui/layout/PageMeta";
import { SITE_TITLE } from "@/lib/config/site/constants";

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

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const typeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

function NewsItem({ item }: { item: NewsItem }) {
  return (
    <article className="thread-module mb-4">
      <h2 className="thread-headline text-xl font-bold mb-1">
        <Link href={`/community/news/${item.id}`}>{item.title}</Link>
      </h2>
      <p className="text-sm text-nb-ink-mid mb-3">
        {typeLabel(item.type)} · <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
      </p>
      <p className="mb-0 leading-relaxed">{item.summary}</p>
    </article>
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
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <PageMeta title="News" description={`Site news and announcements from ${SITE_TITLE}.`} path="/community/news" />
      <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
        <CommunityHeader current="news" />

        <div className="max-w-3xl">
          {news.length === 0 ? (
            <div className="thread-module text-center">
              <p className="mb-0 text-nb-ink-mid">No news yet.</p>
            </div>
          ) : (
            <>
              {news.map((item) => (
                <NewsItem key={item.id} item={item} />
              ))}

              {hasMore && (
                <div className="text-center mt-6">
                  <button onClick={loadMore} disabled={loading} className="btn btn--secondary">
                    {loading ? 'Loading…' : 'Older news'}
                  </button>
                </div>
              )}

              {error && (
                <Callout title="That didn't load">
                  <p>{error}</p>
                </Callout>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<NewsPageProps> = async ({ req }) => {
  const base = getInternalBaseUrl();

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