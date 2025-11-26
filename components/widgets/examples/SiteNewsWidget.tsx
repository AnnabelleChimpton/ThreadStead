import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';

const siteNewsConfig: WidgetConfig = {
  id: 'site-news',
  title: 'Site News',
  description: 'Latest updates and announcements',
  category: 'utility',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 3600000 // 1 hour
};

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  type: 'announcement' | 'feature' | 'maintenance' | 'community';
  priority: 'high' | 'medium' | 'low';
  author?: string;
}

interface SiteNewsData {
  news: NewsItem[];
  hasMore: boolean;
}

function SiteNewsWidget({ data, isLoading, error }: WidgetProps & { data?: SiteNewsData }) {
  // Prevent hydration mismatch from time formatting by only rendering after client hydration
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Unable to load site news</p>
      </div>
    );
  }

  if (!data || data.news.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No news updates available</p>
      </div>
    );
  }

  const formatTimeAgo = (publishedAt: string) => {
    if (!isClient) return 'Recently'; // Static text during SSR

    const date = new Date(publishedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeInfo = (type: NewsItem['type']) => {
    switch (type) {
      case 'announcement':
        return { emoji: '📢', color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'feature':
        return { emoji: '✨', color: 'text-purple-600', bgColor: 'bg-purple-50' };
      case 'maintenance':
        return { emoji: '🔧', color: 'text-orange-600', bgColor: 'bg-orange-50' };
      case 'community':
        return { emoji: '🏘️', color: 'text-green-600', bgColor: 'bg-green-50' };
      default:
        return { emoji: '📰', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const getPriorityIndicator = (priority: NewsItem['priority']) => {
    switch (priority) {
      case 'high':
        return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full flex-shrink-0"></div>;
      case 'medium':
        return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>;
      case 'low':
      default:
        return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full flex-shrink-0"></div>;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* News Items */}
      <div className="space-y-2.5 sm:space-y-3">
        {data.news.slice(0, 4).map((item) => {
          const typeInfo = getTypeInfo(item.type);

          return (
            <div key={item.id} className="border-b border-gray-100 pb-2.5 sm:pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-start space-x-2 sm:space-x-3">
                {getPriorityIndicator(item.priority)}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                    <span className="text-sm">{typeInfo.emoji}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 sm:px-2.5 rounded ${typeInfo.bgColor} ${typeInfo.color}`}>
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                  </div>

                  <Link
                    href={item.url}
                    className="block hover:text-blue-600 transition-colors"
                  >
                    <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {item.summary}
                    </p>
                  </Link>

                  {item.author && (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">
                        by {item.author}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View More Link */}
      {data.hasMore && (
        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/news"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center"
          >
            View all news →
          </Link>
        </div>
      )}
    </div>
  );
}

export const siteNewsWidget = {
  config: siteNewsConfig,
  component: SiteNewsWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async (user?: any) => {
    try {
      const response = await fetch('/api/site-news?limit=5', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch site news');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching site news:', error);

      // Fallback to mock data if API fails
      const mockNews: NewsItem[] = [
        {
          id: '1',
          title: 'Widget System Launch',
          summary: 'Customize your homepage with widgets! Choose from weather, friend activity, and community updates.',
          url: '/news/widget-system-launch',
          publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'announcement',
          priority: 'medium',
          author: 'Product Team'
        },
        {
          id: '2',
          title: 'New Pixel Home Templates Available',
          summary: 'Introducing the Loft and Cabin templates with enhanced customization options.',
          url: '/news/new-pixel-home-templates',
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'feature',
          priority: 'medium',
          author: 'Threadstead Team'
        }
      ];

      return {
        news: mockNews,
        hasMore: false
      };
    }
  }
};