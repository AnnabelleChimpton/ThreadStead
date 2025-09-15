import React from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';

const trendingContentConfig: WidgetConfig = {
  id: 'trending-content',
  title: 'Trending Content',
  description: 'Popular posts and content from the community',
  category: 'community',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 600000 // 10 minutes
};

interface TrendingPost {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  title: string;
  intent: string | null;
  createdAt: string;
  bodyText: string | null;
  commentCount: number;
  threadRings: any[];
  isSpoiler?: boolean;
  contentWarning?: string | null;
}

interface TrendingContentData {
  posts: TrendingPost[];
  hasMore: boolean;
  source: 'trending' | 'recent'; // Indicates if we got trending data or fell back to recent
}

function TrendingContentWidget({ data, isLoading, error }: WidgetProps & { data?: TrendingContentData }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
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
        <p className="text-sm">Unable to load trending content</p>
      </div>
    );
  }

  if (!data || data.posts.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No trending content available</p>
        <div className="mt-2">
          <Link
            href="/feed"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Explore community feed →
          </Link>
        </div>
      </div>
    );
  }

  const formatTimeAgo = (createdAt: string) => {
    const date = new Date(createdAt);
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

  const truncateText = (text: string | null, maxLength: number = 120) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getTrendingIcon = () => {
    if (data.source === 'trending') {
      return '🔥'; // Fire emoji for actual trending content
    }
    return '📈'; // Chart emoji for popular recent content
  };

  return (
    <div className="space-y-4">
      {/* Widget Header with trending indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTrendingIcon()}</span>
          <span className="text-sm font-medium text-gray-600">
            {data.source === 'trending' ? 'Trending Now' : 'Popular Recent'}
          </span>
        </div>
      </div>

      {/* Trending Posts */}
      <div className="space-y-3">
        {data.posts.slice(0, 3).map((post, index) => (
          <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-start space-x-3">
              {/* Trending Rank */}
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>

              {/* Author Avatar */}
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {post.authorAvatarUrl ? (
                  <img
                    src={post.authorAvatarUrl}
                    alt={`${post.authorDisplayName || post.authorUsername}&apos;s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 text-xs font-medium">
                    {(post.authorDisplayName || post.authorUsername || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Post Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Link
                    href={`/resident/${post.authorUsername}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate"
                  >
                    {post.authorDisplayName || post.authorUsername || 'Anonymous'}
                  </Link>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>

                {/* Content Warning */}
                {post.isSpoiler && post.contentWarning && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
                      ⚠️ {post.contentWarning}
                    </span>
                  </div>
                )}

                <Link
                  href={`/resident/${post.authorUsername}/post/${post.id}`}
                  className="block hover:text-blue-600 transition-colors"
                >
                  {post.title && (
                    <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-1">
                      {post.title}
                    </h4>
                  )}
                  {post.bodyText && !post.isSpoiler && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {truncateText(post.bodyText)}
                    </p>
                  )}
                  {post.isSpoiler && (
                    <p className="text-xs text-gray-500 italic">
                      Content hidden due to spoiler warning
                    </p>
                  )}
                </Link>

                {/* Post Metadata */}
                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                  {post.commentCount > 0 && (
                    <span>💬 {post.commentCount}</span>
                  )}
                  {post.intent && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {post.intent}
                    </span>
                  )}
                  {post.threadRings && post.threadRings.length > 0 && (
                    <span>🔗 {post.threadRings.length} ring{post.threadRings.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pt-2">
        <Link
          href="/feed"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          View all community content →
        </Link>
      </div>
    </div>
  );
}

export const trendingContentWidget = {
  config: trendingContentConfig,
  component: TrendingContentWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async () => {
    try {
      // First try to get trending content from Ring Hub
      let response = await fetch('/api/feed/trending?limit=6&timeWindow=day');

      if (response.ok) {
        const trendingData = await response.json();
        // If Ring Hub trending worked, return that data
        return {
          posts: trendingData.posts || [],
          hasMore: trendingData.hasMore || false,
          source: 'trending'
        };
      }

      // If trending fails (Ring Hub not available), fall back to recent posts
      console.log('Trending API not available, falling back to recent posts');

      response = await fetch('/api/feed/recent?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const recentData = await response.json();

      // Sort recent posts by comment count and recency to simulate "trending"
      const posts = (recentData.posts || []).sort((a: any, b: any) => {
        // Simple trending algorithm: more comments + more recent = higher score
        const scoreA = (a.commentCount || 0) * 2 + (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const scoreB = (b.commentCount || 0) * 2 + (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return scoreB - scoreA;
      });

      return {
        posts: posts,
        hasMore: recentData.hasMore || false,
        source: 'recent'
      };
    } catch (error) {
      console.error('Error fetching trending content:', error);
      throw error;
    }
  }
};