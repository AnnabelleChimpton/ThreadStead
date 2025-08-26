import React, { useState, useEffect, useCallback } from "react";
import PostItem from "./PostItem";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type RingHubFeedType = "my-rings" | "trending";

interface RingHubPost {
  id: string;
  ringId: string;
  ringSlug: string;
  ringName: string;
  actorDid: string;
  actorName: string | null;
  uri: string;
  digest: string;
  submittedAt: string;
  submittedBy: string;
  status: "ACCEPTED";
  metadata: any | null;
  pinned: boolean;
  isNotification: boolean;
  notificationType: string | null;
}

interface RingHubFeedResponse {
  posts: RingHubPost[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timeWindow?: string;
  generatedAt: string;
}

type RingHubFeedProps = {
  type: RingHubFeedType;
  timeWindow?: "hour" | "day" | "week";
  includeNotifications?: boolean;
};

export default function RingHubFeed({ 
  type, 
  timeWindow = "day", 
  includeNotifications = true 
}: RingHubFeedProps) {
  const { user: currentUser } = useCurrentUser();
  const [posts, setPosts] = useState<RingHubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resolvedUsernames, setResolvedUsernames] = useState<Map<string, string>>(new Map());

  const endpoint = type === "my-rings" ? "/api/feed/my-rings" : "/api/feed/trending";

  const loadPosts = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoadingMore(true);
    setError(null);

    try {
      const offset = isInitial ? 0 : posts.length;
      let url = `${endpoint}?limit=20&offset=${offset}&includeNotifications=${includeNotifications}`;
      
      if (type === "trending") {
        url += `&timeWindow=${timeWindow}`;
      }

      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Please log in to view your rings feed");
        }
        throw new Error(errorData.message || `Failed to load posts: ${res.status}`);
      }

      const data: RingHubFeedResponse = await res.json();
      
      // Debug: Log raw RingHub response to see metadata structure
      console.log('Raw RingHub feed data:', {
        totalPosts: data.posts.length,
        samplePost: data.posts[0],
        notificationPosts: data.posts.filter(p => p.isNotification || p.metadata?.type === 'fork_notification')
      });
      
      // Client-side filtering if server doesn't properly filter notifications
      let filteredPosts = data.posts;
      if (!includeNotifications) {
        filteredPosts = data.posts.filter(post => !post.isNotification);
        console.log('Filtered out notifications:', {
          original: data.posts.length,
          filtered: filteredPosts.length,
          removed: data.posts.length - filteredPosts.length
        });
      }
      
      if (isInitial) {
        setPosts(filteredPosts);
      } else {
        setPosts(prev => [...prev, ...filteredPosts]);
      }
      
      // Resolve DIDs to usernames for posts we don't have resolved yet
      const newDIDs = data.posts
        .map(p => p.actorDid)
        .filter(did => !resolvedUsernames.has(did));
        
      if (newDIDs.length > 0) {
        try {
          const response = await fetch('/api/users/resolve-dids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dids: newDIDs })
          });
          
          if (response.ok) {
            const { resolved } = await response.json();
            setResolvedUsernames(prev => {
              const newMap = new Map(prev);
              Object.entries(resolved).forEach(([did, username]) => {
                newMap.set(did, username as string);
              });
              return newMap;
            });
          }
        } catch (err) {
          console.error('Failed to resolve DIDs:', err);
        }
      }
      
      // Handle pagination - use RingHub pagination if available, otherwise assume no more
      if (data.pagination) {
        setHasMore(data.pagination.hasMore);
      } else {
        // For trending feed without pagination, check if we got fewer posts than requested
        setHasMore(data.posts.length === 20);
      }
    } catch (err) {
      console.error("RingHub feed error:", err);
      setError((err as Error)?.message || "Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [endpoint, posts.length, timeWindow, includeNotifications, type]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    loadPosts(true);
  }, [type, timeWindow, includeNotifications]);

  // Convert RingHub post to PostItem format
  const convertToPostItem = useCallback((ringHubPost: RingHubPost) => {
    // Check if this is a fork notification to provide additional debugging
    const isForkNotification = ringHubPost.isNotification && 
                              ringHubPost.notificationType === 'fork_notification' &&
                              ringHubPost.metadata?.type === 'fork_notification';
    
    if (isForkNotification) {
      console.log('Fork notification detected:', {
        id: ringHubPost.id,
        isNotification: ringHubPost.isNotification,
        notificationType: ringHubPost.notificationType,
        metadata: ringHubPost.metadata
      });
    }

    // Always log what we're converting to help debug
    console.log('Converting RingHub post:', {
      id: ringHubPost.id,
      isNotification: ringHubPost.isNotification,
      notificationType: ringHubPost.notificationType,
      metadataType: ringHubPost.metadata?.type,
      hasForkedRingData: !!ringHubPost.metadata?.forkedRing,
      ringHubPost: ringHubPost
    });

    return {
      id: `ringhub-${ringHubPost.id}`,
      title: null,
      intent: null,
      createdAt: ringHubPost.submittedAt,
      bodyText: null,
      bodyHtml: null,
      bodyMarkdown: null,
      visibility: "public" as const,
      textPreview: null,
      excerpt: null,
      publishedAt: ringHubPost.submittedAt,
      platform: "RingHub",
      isPinned: ringHubPost.pinned,
      pinnedAt: ringHubPost.pinned ? ringHubPost.submittedAt : null,
      
      // Author info from RingHub - improve DID handling
      author: {
        id: ringHubPost.actorDid,
        primaryHandle: (() => {
          // Extract readable part from DID
          if (ringHubPost.actorDid.startsWith('did:web:')) {
            return ringHubPost.actorDid.replace('did:web:', '').split('.')[0] || ringHubPost.actorDid;
          }
          // For other DIDs, try to get the last meaningful part
          const parts = ringHubPost.actorDid.split(':');
          return parts[parts.length - 1] || ringHubPost.actorDid;
        })(),
        profile: {
          displayName: resolvedUsernames.get(ringHubPost.actorDid) || 
                      ringHubPost.actorName || (() => {
            // Better fallback for display name from DID
            if (ringHubPost.actorDid.startsWith('did:web:')) {
              return ringHubPost.actorDid.replace('did:web:', '').split('.')[0] || 'User';
            }
            const parts = ringHubPost.actorDid.split(':');
            return parts[parts.length - 1] || 'User';
          })()
        }
      },

      // RingHub-specific data - ensure metadata is properly passed
      ringHubData: {
        id: ringHubPost.id,
        ringSlug: ringHubPost.ringSlug,
        submittedAt: ringHubPost.submittedAt,
        submittedBy: ringHubPost.submittedBy,
        status: ringHubPost.status,
        pinned: ringHubPost.pinned,
        metadata: ringHubPost.metadata, // This should contain fork notification data
        isNotification: ringHubPost.isNotification,
        notificationType: ringHubPost.notificationType || undefined
      },

      // ThreadRing context for display
      threadRings: [{
        threadRing: {
          id: ringHubPost.ringId,
          name: ringHubPost.ringName,
          slug: ringHubPost.ringSlug
        }
      }]
    };
  }, [resolvedUsernames]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-100 border border-gray-300 p-6 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
        <div className="bg-gray-100 border border-gray-300 p-6 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-3/5"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 p-6 text-center">
        <div className="text-red-800 font-medium mb-2">Failed to Load Feed</div>
        <div className="text-red-700 text-sm mb-4">{error}</div>
        <button
          onClick={() => loadPosts(true)}
          className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-300 p-8 text-center">
        <div className="text-gray-600 mb-2">
          {type === "my-rings" 
            ? "No posts in your rings yet" 
            : "No trending posts found"
          }
        </div>
        <div className="text-sm text-gray-500">
          {type === "my-rings" 
            ? "Join some ThreadRings to see posts in your feed" 
            : "Check back later for trending content"
          }
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((ringHubPost) => {
        const postItem = convertToPostItem(ringHubPost);
        return (
          <PostItem
            key={postItem.id}
            post={postItem}
            isOwner={false}
            currentUser={currentUser}
            threadRingContext={{
              slug: ringHubPost.ringSlug,
              name: ringHubPost.ringName
            }}
          />
        );
      })}

      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={() => loadPosts(false)}
            disabled={loadingMore}
            className="border border-black px-6 py-3 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More Posts"}
          </button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center text-gray-500 text-sm mt-6">
          That&apos;s all for now!
        </div>
      )}
    </div>
  );
}