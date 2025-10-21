import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';
import UserMention from '@/components/ui/navigation/UserMention';

const newNeighborsConfig: WidgetConfig = {
  id: 'new-neighbors',
  title: 'New Neighbors',
  description: 'Recently joined users in your community',
  category: 'social',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 300000 // 5 minutes
};

interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
}

interface NewNeighborsData {
  users: User[];
  total: number;
}

function NewNeighborsWidget({ data, isLoading, error }: WidgetProps & { data?: NewNeighborsData }) {
  // Prevent hydration mismatch from date formatting by only rendering after client hydration
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Unable to load new neighbors</p>
      </div>
    );
  }

  if (!data || data.users.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No new neighbors yet</p>
      </div>
    );
  }

  const formatJoinDate = (createdAt: string) => {
    if (!isClient) return 'Recently'; // Static text during SSR

    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      {data.users.slice(0, 3).map((user) => (
        <div key={user.id} className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.displayName || user.username}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-xs font-medium">
                {(user.displayName || user.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              {user.username && (
                <UserMention
                  username={user.username}
                  displayName={user.displayName || user.username}
                  className="text-xs text-blue-600 transition-colors"
                />
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span>Joined {formatJoinDate(user.createdAt)}</span>
              {user.postCount > 0 && (
                <span>{user.postCount} post{user.postCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            {user.bio && (
              <p className="text-xs text-gray-600 mt-1 truncate">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      ))}

      {data.users.length > 3 && (
        <div className="text-center pt-2 border-t border-gray-100">
          <Link
            href="/directory"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            View all {data.total} neighbors →
          </Link>
        </div>
      )}
    </div>
  );
}

export const newNeighborsWidget = {
  config: newNeighborsConfig,
  component: NewNeighborsWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async () => {
    try {
      const response = await fetch('/api/directory?limit=10&sortBy=recent');
      if (!response.ok) {
        throw new Error('Failed to fetch new neighbors');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching new neighbors:', error);
      throw error;
    }
  }
};