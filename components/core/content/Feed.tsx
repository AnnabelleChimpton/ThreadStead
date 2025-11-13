import React, { useState, useEffect, useCallback } from "react";
import FeedPost, { FeedPostData } from "./FeedPost";
import { PostSkeletonList } from "./PostSkeleton";
import { useSiteConfig } from "@/hooks/useSiteConfig";

type FeedType = "recent" | "active";

type FeedProps = {
  type: FeedType;
};

type FeedResponse = {
  posts: FeedPostData[];
  hasMore: boolean;
};

export default function Feed({ type }: FeedProps) {
  const { config } = useSiteConfig();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const endpoint = type === "recent" ? "/api/feed/recent" : "/api/feed/active";

  const loadPosts = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoadingMore(true);
    setError(null);

    try {
      // Use a variable to capture the current offset before the async call
      let offset = 0;
      if (!isInitial) {
        setPosts(prev => {
          offset = prev.length;
          return prev;
        });
      }
      const res = await fetch(`${endpoint}?limit=10&offset=${offset}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load posts: ${res.status}`);
      }

      const data: FeedResponse = await res.json();
      
      if (isInitial) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }
      
      setHasMore(data.hasMore);
    } catch (err) {
      setError((err as Error)?.message || "Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [endpoint]);

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [type, loadPosts]);

  function loadMore() {
    if (!hasMore || loadingMore) return;
    loadPosts(false);
  }

  if (loading) {
    return <PostSkeletonList count={4} />;
  }

  if (error) {
    return (
      <div className="thread-module p-4 sm:p-5 md:p-6">
        <div className="text-thread-sunset bg-red-50 border border-red-200 p-3 rounded-cozy">
          <span className="thread-label">error</span>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="thread-module p-4 sm:p-6 md:p-8 text-center">
        <h3 className="thread-headline text-lg mb-2">No posts yet</h3>
        <p className="text-thread-sage">
          {type === "recent" 
            ? config.feed_empty_message
            : "No posts with recent activity found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {posts.map((post) => (
        <FeedPost 
          key={post.id} 
          post={post} 
          showActivity={type === "active"} 
        />
      ))}

      {hasMore && (
        <div className="text-center py-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="thread-button disabled:opacity-50"
          >
            {loadingMore ? "Loading more…" : "Load More Posts"}
          </button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6">
          <span className="thread-label">
            That&apos;s all for now — check back later for more!
          </span>
        </div>
      )}
    </div>
  );
}