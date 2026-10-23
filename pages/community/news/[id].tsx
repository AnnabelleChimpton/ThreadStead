import React from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import CommunityHeader from "@/components/ui/navigation/CommunityHeader";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import Link from "next/link";
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import PageMeta from '@/components/ui/layout/PageMeta';

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

interface NewsArticlePageProps {
  siteConfig: SiteConfig;
  article: NewsItem;
}

export default function NewsArticlePage({ siteConfig, article }: NewsArticlePageProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Process content - if it exists and looks like markdown, render it as HTML
  const getContentHTML = () => {
    if (!article.content) return null;

    try {
      // Check if content contains markdown syntax
      const hasMarkdown = article.content.includes('#') ||
                          article.content.includes('**') ||
                          article.content.includes('*') ||
                          article.content.includes('[') ||
                          article.content.includes('```');

      if (hasMarkdown) {
        const html = marked.parse(article.content, { async: false }) as string;
        return DOMPurify.sanitize(html);
      } else {
        // Plain text - convert line breaks to HTML
        return DOMPurify.sanitize(article.content.replace(/\n/g, '<br>'));
      }
    } catch (error) {
      console.error('Error processing content:', error);
      return DOMPurify.sanitize(article.content.replace(/\n/g, '<br>'));
    }
  };

  const contentHTML = getContentHTML();

  return (
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <PageMeta title={article.title} description={article.summary} path={`/community/news/${article.id}`} type="article" />
      <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
        <CommunityHeader current="news" />

        <article className="thread-module max-w-3xl">
          <p className="mb-3 text-sm">
            <Link href="/community/news">← All news</Link>
          </p>
          <h2 className="thread-headline text-2xl sm:text-3xl font-bold mb-1">{article.title}</h2>
          <p className="text-sm text-nb-ink-mid mb-4">
            {article.type.charAt(0).toUpperCase() + article.type.slice(1)} ·{' '}
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </p>

          <p className="text-lg leading-relaxed mb-4">{article.summary}</p>

          {contentHTML && (
            <div className="news-article-body leading-relaxed [&_p]:mb-3" dangerouslySetInnerHTML={{ __html: contentHTML }} />
          )}
        </article>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<NewsArticlePageProps> = async ({ params, req }) => {
  const id = String(params?.id || "");

  if (!id) {
    return { notFound: true };
  }

  const base = getInternalBaseUrl();

  try {
    // Fetch site config
    const siteConfig = await getSiteConfig();

    // Fetch the specific news article
    const articleRes = await fetch(`${base}/api/site-news/${encodeURIComponent(id)}`);

    if (!articleRes.ok) {
      return { notFound: true };
    }

    const articleData = await articleRes.json();

    if (!articleData.success || !articleData.news) {
      return { notFound: true };
    }

    const article = articleData.news;

    // Check if article is published
    if (!article.isPublished) {
      return { notFound: true };
    }

    return {
      props: {
        siteConfig,
        article
      }
    };
  } catch (error) {
    console.error("Error fetching news article:", error);
    return { notFound: true };
  }
};