import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';
import UserMention from '@/components/ui/navigation/UserMention';

const friendActivityConfig: WidgetConfig = {
  id: 'friend-activity',
  title: 'Friend Activity',
  description: 'Recent posts from your friends',
  category: 'social',
  size: 'medium',
  requiresAuth: true,
  defaultEnabled: true,
  refreshInterval: 300000 // 5 minutes
};

interface Friend {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
}

interface FriendPost {
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
}

interface FriendActivityData {
  friends: Friend[];
  recentPosts: FriendPost[];
}

function FriendActivityWidget({ data, isLoading, error, user }: WidgetProps & { data?: FriendActivityData }) {
  // Prevent hydration mismatch from time formatting by only rendering after client hydration
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Login to see friend activity</p>
      </div>
    );
  }

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
        <p className="text-sm">Unable to load friend activity</p>
      </div>
    );
  }

  if (!data || (data.friends.length === 0 && data.recentPosts.length === 0)) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm mb-2">No friend activity yet</p>
        <Link
          href="/directory"
          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          Find friends to follow →
        </Link>
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

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const extractUsername = (handle: string | null) => {
    if (!handle) return null;
    // Remove @sitename suffix if present
    const atIndex = handle.indexOf('@');
    return atIndex > 0 ? handle.substring(0, atIndex) : handle;
  };

  return (
    <div className="space-y-4">
      {/* Recent Friend Posts */}
      {data.recentPosts && data.recentPosts.length > 0 && (
        <div className="space-y-3">
          {data.recentPosts.slice(0, 3).map((post) => (
            <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-start space-x-3">
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {extractUsername(post.authorUsername) ? (
                      <UserMention
                        username={extractUsername(post.authorUsername)!}
                        displayName={post.authorDisplayName || extractUsername(post.authorUsername)!}
                        className="text-sm font-medium text-gray-900 transition-colors truncate"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900 truncate">Anonymous</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>

                  <Link
                    href={`/resident/${extractUsername(post.authorUsername)}/post/${post.id}`}
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
        </div>
      )}

      {/* Friend List Summary */}
      {data.friends && data.friends.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {data.friends.slice(0, 4).map((friend) => (
                <Link
                  key={friend.id}
                  href={`/resident/${extractUsername(friend.handle)}`}
                  className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center overflow-hidden hover:z-10 transition-transform hover:scale-110"
                >
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt={`${friend.displayName}&apos;s avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-xs font-medium">
                      {friend.displayName[0].toUpperCase()}
                    </span>
                  )}
                </Link>
              ))}
              {data.friends.length > 4 && (
                <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600">
                  +{data.friends.length - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {data.friends.length} friend{data.friends.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* No posts but have friends */}
      {data.friends.length > 0 && (!data.recentPosts || data.recentPosts.length === 0) && (
        <div className="text-center py-2 text-gray-500">
          <p className="text-sm">Your friends haven&apos;t posted recently</p>
        </div>
      )}
    </div>
  );
}

export const friendActivityWidget = {
  config: friendActivityConfig,
  component: FriendActivityWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async (user?: any) => {
    if (!user) {
      throw new Error('Authentication required for friend activity');
    }

    try {
      // First get the user's friends
      const friendsResponse = await fetch('/api/friends', {
        credentials: 'include'
      });

      if (!friendsResponse.ok) {
        throw new Error('Failed to fetch friends');
      }

      const friendsData = await friendsResponse.json();
      const friends = friendsData.friends || [];

      // If no friends, return early
      if (friends.length === 0) {
        return {
          friends: [],
          recentPosts: []
        };
      }

      // Get recent posts from all friends
      const recentPosts: any[] = [];

      // Fetch recent posts from first few friends to avoid too many requests
      const friendsToCheck = friends.slice(0, 5); // Limit to 5 friends for performance

      for (const friend of friendsToCheck) {
        try {
          const postsResponse = await fetch(`/api/posts/${friend.handle}?limit=2`, {
            credentials: 'include'
          });

          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            if (postsData.posts) {
              recentPosts.push(...postsData.posts);
            }
          }
        } catch (error) {
          console.error(`Error fetching posts for ${friend.handle}:`, error);
          // Continue with other friends
        }
      }

      // Sort all posts by creation date and take the most recent
      recentPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        friends,
        recentPosts: recentPosts.slice(0, 5) // Keep top 5 most recent
      };
    } catch (error) {
      console.error('Error fetching friend activity:', error);
      throw error;
    }
  }
};