import React, { useState, useEffect, useCallback } from "react";
import PostItem from "./PostItem";
import PromptItem from "./PromptItem";
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
  postContent?: any; // Actual post content from ThreadStead
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
      
      
      // Client-side filtering if server doesn't properly filter notifications
      let filteredPosts = data.posts;
      if (!includeNotifications) {
        filteredPosts = data.posts.filter(post => !post.isNotification);
      }
      
      // Fetch actual post content for ThreadStead posts
      const enrichedPosts = await Promise.all(
        filteredPosts.map(async (ringHubPost) => {
          // Skip notifications and special post types
          if (ringHubPost.isNotification || ringHubPost.metadata?.type === 'threadring_prompt') {
            return ringHubPost;
          }
          
          // Extract post ID from URI for ThreadStead posts
          const postIdMatch = ringHubPost.uri.match(/\/posts?\/([^\/\?]+)/);
          if (postIdMatch && postIdMatch[1]) {
            try {
              const postRes = await fetch(`/api/posts/single/${postIdMatch[1]}`);
              if (postRes.ok) {
                const { post } = await postRes.json();
                // Merge the actual post content with RingHub metadata
                return {
                  ...ringHubPost,
                  postContent: post
                };
              }
            } catch (err) {
              console.error(`Failed to fetch post content for ${ringHubPost.uri}:`, err);
            }
          }
          
          return ringHubPost;
        })
      );
      
      if (isInitial) {
        setPosts(enrichedPosts);
      } else {
        setPosts(prev => [...prev, ...enrichedPosts]);
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
    
    // Use actual post content if available
    const hasPostContent = !!(ringHubPost.postContent && !ringHubPost.isNotification);

    // Debug: Check what we're about to return
    const finalPost = {
      id: hasPostContent ? ringHubPost.postContent.id : `ringhub-${ringHubPost.id}`,
      title: hasPostContent ? ringHubPost.postContent.title : null,
      intent: hasPostContent ? ringHubPost.postContent.intent : null,
      createdAt: hasPostContent ? ringHubPost.postContent.createdAt : ringHubPost.submittedAt,
      bodyText: hasPostContent ? ringHubPost.postContent.bodyText : null,
      bodyHtml: hasPostContent ? ringHubPost.postContent.bodyHtml : null,
      bodyMarkdown: hasPostContent ? ringHubPost.postContent.bodyMarkdown : null,
      visibility: hasPostContent ? ringHubPost.postContent.visibility : "public" as const,
      textPreview: hasPostContent ? ringHubPost.postContent.textPreview : null,
      excerpt: hasPostContent ? ringHubPost.postContent.excerpt : null,
      publishedAt: hasPostContent ? ringHubPost.postContent.publishedAt : ringHubPost.submittedAt,
      platform: hasPostContent ? "ThreadStead" : "RingHub",
      isPinned: ringHubPost.pinned,
      pinnedAt: ringHubPost.pinned ? ringHubPost.submittedAt : null,
      
      // CRITICAL: Content warning/spoiler fields - absolutely required for user safety
      isSpoiler: hasPostContent ? ringHubPost.postContent.isSpoiler : (ringHubPost.metadata?.isSpoiler || false),
      contentWarning: hasPostContent ? ringHubPost.postContent.contentWarning : (ringHubPost.metadata?.contentWarning || null),
      
      // Author info - use actual post author when available
      author: hasPostContent && ringHubPost.postContent.author ? {
        id: ringHubPost.postContent.author.id,
        primaryHandle: ringHubPost.postContent.author.primaryHandle,
        profile: ringHubPost.postContent.author.profile
      } : {
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

      // ThreadRing context - use actual post threadRings if available, otherwise use RingHub data
      threadRings: hasPostContent && ringHubPost.postContent.threadRings 
        ? ringHubPost.postContent.threadRings
        : [{
            threadRing: {
              id: ringHubPost.ringId,
              name: ringHubPost.ringName,
              slug: ringHubPost.ringSlug
            }
          }]
    };
    
    return finalPost;
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
        // Check if this is a prompt PostRef - check both possible locations
        const isPrompt = ringHubPost.metadata?.type === 'threadring_prompt' || 
                          ringHubPost.notificationType === 'threadring_prompt';
        
        
        if (isPrompt) {
          
          // Extract prompt data from the correct location
          let promptData;
          if (ringHubPost.metadata?.type === 'threadring_prompt') {
            promptData = ringHubPost.metadata.prompt;
          } else if (ringHubPost.notificationType === 'threadring_prompt') {
            // Handle case where prompt data is in a different structure
            promptData = {
              promptId: ringHubPost.id,
              title: ringHubPost.metadata?.title || 'ThreadRing Challenge',
              description: ringHubPost.metadata?.description || 'Join this challenge!',
              startsAt: ringHubPost.submittedAt,
              endsAt: ringHubPost.metadata?.endsAt,
              isActive: true,
              isPinned: ringHubPost.pinned,
              responseCount: 0,
              tags: ringHubPost.metadata?.tags
            };
          }
          
          // Render prompts with special PromptItem component
          return (
            <PromptItem
              key={`prompt-${ringHubPost.id}`}
              post={{
                id: ringHubPost.id,
                ringSlug: ringHubPost.ringSlug,
                ringName: ringHubPost.ringName,
                uri: ringHubPost.uri,
                submittedAt: ringHubPost.submittedAt,
                metadata: {
                  type: 'threadring_prompt',
                  prompt: promptData
                } as any,
                pinned: ringHubPost.pinned
              }}
            />
          );
        }

        // Regular posts get the standard PostItem treatment
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