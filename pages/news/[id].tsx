import React from "react";
import type { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import Link from "next/link";
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

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
    <Layout
      siteConfig={siteConfig}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Back Navigation */}
        <div className="mb-4">
          <Link
            href="/news"
            className="inline-flex items-center px-3 py-1 text-sm border border-black bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] transition-colors"
          >
            ← Back to News
          </Link>
        </div>

        {/* Article */}
        <RetroCard>
          <article className="p-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-start justify-between mb-3">
                <h1 className="text-2xl font-bold text-black pr-4">
                  {article.title}
                </h1>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-1 font-medium rounded ${getTypeColor(article.type)}`}>
                  {article.type.charAt(0).toUpperCase() + article.type.slice(1)}
                </span>
                <span className="text-gray-600">
                  Published: {formatDate(article.publishedAt)}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6">
              <p className="text-gray-700 text-base leading-relaxed font-medium">
                {article.summary}
              </p>
            </div>

            {/* Content */}
            {contentHTML && (
              <div
                className="prose prose-gray max-w-none"
                style={{
                  '--tw-prose-body': '#374151',
                  '--tw-prose-headings': '#111827',
                  '--tw-prose-links': '#2563eb',
                  '--tw-prose-bold': '#111827',
                  '--tw-prose-counters': '#6b7280',
                  '--tw-prose-bullets': '#6b7280',
                  '--tw-prose-hr': '#e5e7eb',
                  '--tw-prose-quotes': '#111827',
                  '--tw-prose-quote-borders': '#e5e7eb',
                  '--tw-prose-captions': '#6b7280',
                  '--tw-prose-code': '#111827',
                  '--tw-prose-pre-code': '#e5e7eb',
                  '--tw-prose-pre-bg': '#1f2937',
                  '--tw-prose-th-borders': '#d1d5db',
                  '--tw-prose-td-borders': '#e5e7eb'
                } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: contentHTML }}
              />
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Link
                  href="/news"
                  className="inline-flex items-center px-4 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] transition-colors"
                >
                  ← Back to All News
                </Link>

                <div className="text-sm text-gray-500">
                  Article ID: {article.id}
                </div>
              </div>
            </div>
          </article>
        </RetroCard>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<NewsArticlePageProps> = async ({ params, req }) => {
  const id = String(params?.id || "");

  if (!id) {
    return { notFound: true };
  }

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

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