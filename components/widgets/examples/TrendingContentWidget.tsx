import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';
import UserMention from '@/components/ui/navigation/UserMention';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';

const trendingContentConfig: WidgetConfig = {
  id: 'trending-content',
  title: "What's Hot Right Now",
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
  isRingHubPost?: boolean;
  ringHubId?: string;
}

interface TrendingContentData {
  posts: TrendingPost[];
  hasMore: boolean;
  source: 'local_trending' | 'ringhub_trending' | 'trending' | 'recent'; // Indicates the data source
}

function TrendingContentWidget({ data, isLoading, error }: WidgetProps & { data?: TrendingContentData }) {
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
              <div className="w-8 h-8 bg-nb-ink-mid/15 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-nb-ink-mid/15 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-nb-ink-mid/15 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-nb-ink-mid/15 rounded w-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-nb-ink-mid">
        <p className="text-sm">Unable to load trending content</p>
      </div>
    );
  }

  if (!data || data.posts.length === 0) {
    return (
      <div className="text-center py-4 text-nb-ink-mid">
        <p className="text-sm">No trending content available</p>
        <div className="mt-2">
          <Link
            href="/feed"
            className="text-xs"
          >
            Explore community feed →
          </Link>
        </div>
      </div>
    );
  }

  const formatTimeAgo = (createdAt: string) => {
    if (!isClient) return 'Recently'; // Static text during SSR

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

  return (
    <div className="space-y-4">
      {/* Where the list came from */}
      <div className="thread-label">
        {data.source === 'local_trending' ? 'Trending Now' :
          data.source === 'ringhub_trending' ? 'Ring Hub Trending' :
            data.source === 'trending' ? 'Trending Now' : 'Popular Recent'}
      </div>

      {/* Trending Posts */}
      <div className="space-y-3">
        {data.posts.slice(0, 3).map((post, index) => (
          <div key={post.id} className="border-b border-dotted border-nb-ink-mid/50 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-start space-x-3">
              {/* Trending Rank */}
              <div className="flex-shrink-0 w-4 pt-2 font-mono text-xs font-bold text-nb-ink-mid text-right">
                {index + 1}
              </div>

              {/* Author Avatar */}
              <div className="w-8 h-8 bg-thread-cream border border-nb-ink-mid/40 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                {post.authorAvatarUrl ? (
                  <img
                    src={post.authorAvatarUrl}
                    alt={`${post.authorDisplayName || post.authorUsername}&apos;s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-nb-ink-mid text-xs font-medium">
                    {(post.authorDisplayName || post.authorUsername || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Post Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {post.authorUsername ? (
                    <UserMention
                      username={post.authorUsername}
                      displayName={post.authorDisplayName || post.authorUsername}
                      className="text-sm font-medium text-nb-ink transition-colors truncate"
                    />
                  ) : (
                    <span className="text-sm font-medium text-nb-ink truncate">
                      {post.authorDisplayName || 'External User'}
                      {post.isRingHubPost && <span className="text-xs text-nb-ink-mid ml-1">(Ring Hub)</span>}
                    </span>
                  )}
                  <span className="text-xs text-nb-ink-mid">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>

                {/* Content Warning */}
                {post.isSpoiler && post.contentWarning && (
                  <div className="mb-2">
                    <span className="badge badge--butter inline-flex items-center gap-1 text-xs">
                      <PixelIcon name="alert" className="inline-block align-middle" /> {post.contentWarning}
                    </span>
                  </div>
                )}

                <Link
                  href={post.isRingHubPost && post.threadRings?.[0]
                    ? `/tr/${post.threadRings[0].threadRing.slug}`
                    : post.authorUsername
                      ? `/resident/${post.authorUsername}/post/${post.id}`
                      : '#'}
                  className="block no-underline"
                >
                  {post.title && (
                    <h4 className="text-sm font-semibold text-nb-ink mb-1 line-clamp-1 underline decoration-nb-ink-mid/50 underline-offset-2">
                      {post.title}
                    </h4>
                  )}
                  {post.bodyText && !post.isSpoiler && (
                    <p className="text-xs text-nb-ink-mid line-clamp-2">
                      {truncateText(post.bodyText)}
                    </p>
                  )}
                  {post.isSpoiler && (
                    <p className="text-xs text-nb-ink-mid italic">
                      Content hidden due to spoiler warning
                    </p>
                  )}
                </Link>

                {/* Post Metadata */}
                <div className="flex items-center space-x-3 mt-2 text-xs text-nb-ink-mid">
                  {post.commentCount > 0 && (
                    <span><PixelIcon name="chat" className="inline-block align-middle" /> {post.commentCount}</span>
                  )}
                  {post.intent && (
                    <span className="tag text-xs">
                      {post.intent}
                    </span>
                  )}
                  {post.threadRings && post.threadRings.length > 0 && (
                    <span><PixelIcon name="link" className="inline-block align-middle" /> {post.threadRings.length} ring{post.threadRings.length !== 1 ? 's' : ''}</span>
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
          className="text-sm"
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
      // First try local trending with real metrics
      let response = await fetch('/api/feed/local-trending?limit=6&timeWindow=day&minViews=0');

      if (response.ok) {
        const trendingData = await response.json();
        if (trendingData.posts && trendingData.posts.length > 0) {
          return {
            posts: trendingData.posts,
            hasMore: trendingData.hasMore || false,
            source: 'local_trending'
          };
        }
      }

      // If local trending has no results, try Ring Hub trending
      response = await fetch('/api/feed/trending?limit=6&timeWindow=day');

      if (response.ok) {
        const ringHubData = await response.json();
        if (ringHubData.posts && ringHubData.posts.length > 0) {
          // Transform RingHub posts to widget format
          const transformedPosts = ringHubData.posts.map((post: any) => {
            // Handle RingHub post structure
            const hasPostContent = !!(post.postContent && !post.isNotification);

            // Extract readable username from actorDid
            const getDisplayName = (actorDid: string, actorName?: string) => {
              if (actorName) return actorName;
              if (actorDid.startsWith('did:web:')) {
                return actorDid.replace('did:web:', '').split('.')[0] || 'User';
              }
              const parts = actorDid.split(':');
              return parts[parts.length - 1] || 'User';
            };

            const getUsername = (actorDid: string) => {
              if (actorDid.startsWith('did:web:')) {
                return actorDid.replace('did:web:', '').split('.')[0] || null;
              }
              return null; // For non-local users, no username link
            };

            return {
              id: hasPostContent ? post.postContent.id : `ringhub-${post.id}`,
              authorId: post.actorDid,
              authorUsername: getUsername(post.actorDid),
              authorDisplayName: getDisplayName(post.actorDid, post.actorName),
              authorAvatarUrl: null, // RingHub doesn't provide avatars
              title: hasPostContent ? post.postContent.title : 'Ring Hub Activity',
              intent: hasPostContent ? post.postContent.intent : null,
              createdAt: hasPostContent ? post.postContent.createdAt : post.submittedAt,
              bodyText: hasPostContent ? post.postContent.bodyText : null,
              commentCount: post.commentCount || 0,
              threadRings: post.ringSlug ? [{ threadRing: { slug: post.ringSlug, name: post.ringName } }] : [],
              isSpoiler: hasPostContent ? post.postContent.isSpoiler : false,
              contentWarning: hasPostContent ? post.postContent.contentWarning : null,
              isRingHubPost: true, // Flag to identify RingHub posts
              ringHubId: post.id
            };
          });

          return {
            posts: transformedPosts,
            hasMore: ringHubData.hasMore || false,
            source: 'ringhub_trending'
          };
        }
      }

      response = await fetch('/api/feed/recent?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const recentData = await response.json();

      // Sort recent posts by comment count for basic trending
      const posts = (recentData.posts || []).sort((a: any, b: any) => {
        return (b.commentCount || 0) - (a.commentCount || 0);
      });

      return {
        posts: posts.slice(0, 6),
        hasMore: recentData.hasMore || false,
        source: 'recent'
      };
    } catch (error) {
      console.error('Error fetching trending content:', error);
      throw error;
    }
  }
};