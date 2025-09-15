import React from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';

const threadRingActivityConfig: WidgetConfig = {
  id: 'threadring-activity',
  title: 'ThreadRing Activity',
  description: 'Recent posts from ThreadRings',
  category: 'social',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 180000 // 3 minutes
};

interface ThreadRing {
  id: string;
  name: string;
  slug: string;
}

interface ThreadRingMembership {
  threadRing: ThreadRing;
}

interface Post {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  title: string;
  intent: string | null;
  createdAt: string;
  updatedAt: string;
  bodyHtml: string;
  bodyText: string | null;
  bodyMarkdown: string;
  media: any;
  tags: string[] | null;
  commentCount: number;
  threadRings: ThreadRingMembership[];
  isSpoiler: boolean;
  contentWarning: string | null;
}

interface ThreadRingActivityData {
  posts: Post[];
  hasMore: boolean;
}

function ThreadRingActivityWidget({ data, isLoading, error }: WidgetProps & { data?: ThreadRingActivityData }) {
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
        <p className="text-sm">Unable to load ThreadRing activity</p>
      </div>
    );
  }

  if (!data || data.posts.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No ThreadRing activity yet</p>
        <div className="mt-2">
          <Link
            href="/threadrings"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Explore ThreadRings →
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

  // Filter posts that are actually in ThreadRings
  const threadRingPosts = data.posts.filter(post => post.threadRings && post.threadRings.length > 0);

  if (threadRingPosts.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No ThreadRing posts yet</p>
        <div className="mt-2">
          <Link
            href="/threadrings"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Explore ThreadRings →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threadRingPosts.slice(0, 3).map((post) => (
        <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {post.authorAvatarUrl ? (
                <img
                  src={post.authorAvatarUrl}
                  alt={`${post.authorDisplayName || post.authorUsername}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-xs font-medium">
                  {(post.authorDisplayName || post.authorUsername || '?')[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {post.authorDisplayName || post.authorUsername || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>

              {post.threadRings.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {post.threadRings.slice(0, 2).map((membership) => (
                    <Link
                      key={membership.threadRing.id}
                      href={`/threadrings/${membership.threadRing.slug}`}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                    >
                      {membership.threadRing.name}
                    </Link>
                  ))}
                  {post.threadRings.length > 2 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                      +{post.threadRings.length - 2} more
                    </span>
                  )}
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
                {post.bodyText && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {truncateText(post.bodyText)}
                  </p>
                )}
              </Link>

              <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                {post.commentCount > 0 && (
                  <span>{post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}</span>
                )}
                {post.intent && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                    {post.intent}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="text-center pt-2">
        <Link
          href="/feed"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          View all activity →
        </Link>
      </div>
    </div>
  );
}

export const threadRingActivityWidget = {
  config: threadRingActivityConfig,
  component: ThreadRingActivityWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async () => {
    try {
      const response = await fetch('/api/feed/recent?limit=20');
      if (!response.ok) {
        throw new Error('Failed to fetch ThreadRing activity');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ThreadRing activity:', error);
      throw error;
    }
  }
};