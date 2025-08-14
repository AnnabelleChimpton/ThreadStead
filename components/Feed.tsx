import React, { useState, useEffect } from "react";
import FeedPost, { FeedPostData } from "./FeedPost";

type FeedType = "recent" | "active";

type FeedProps = {
  type: FeedType;
};

type FeedResponse = {
  posts: FeedPostData[];
  hasMore: boolean;
};

export default function Feed({ type }: FeedProps) {
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const endpoint = type === "recent" ? "/api/feed/recent" : "/api/feed/active";

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [type]);

  async function loadPosts(isInitial = false) {
    if (!isInitial) setLoadingMore(true);
    setError(null);

    try {
      const offset = isInitial ? 0 : posts.length;
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
  }

  function loadMore() {
    if (!hasMore || loadingMore) return;
    loadPosts(false);
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <span className="thread-label">Loading posts…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="thread-module p-6">
        <div className="text-thread-sunset bg-red-50 border border-red-200 p-3 rounded-cozy">
          <span className="thread-label">error</span>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="thread-module p-8 text-center">
        <h3 className="thread-headline text-lg mb-2">No posts yet</h3>
        <p className="text-thread-sage">
          {type === "recent" 
            ? "Be the first to share something on ThreadStead!" 
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
            That's all for now — check back later for more!
          </span>
        </div>
      )}
    </div>
  );
}