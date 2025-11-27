import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [newPostsCount, setNewPostsCount] = useState(0);

  const postsCountRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const latestPostIdRef = useRef<string | null>(null);

  const endpoint = type === "recent" ? "/api/feed/recent" : "/api/feed/active";

  const loadPosts = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoadingMore(true);
    setError(null);

    try {
      const offset = isInitial ? 0 : postsCountRef.current;
      const res = await fetch(`${endpoint}?limit=10&offset=${offset}`);

      if (!res.ok) {
        throw new Error(`Failed to load posts: ${res.status}`);
      }

      const data: FeedResponse = await res.json();

      if (isInitial) {
        setPosts(data.posts);
        postsCountRef.current = data.posts.length;
        if (data.posts.length > 0) {
          latestPostIdRef.current = data.posts[0].id;
        }
        setNewPostsCount(0); // Reset new posts count on refresh
      } else {
        setPosts(prev => [...prev, ...data.posts]);
        postsCountRef.current += data.posts.length;
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
    postsCountRef.current = 0;
    setLoading(true);
    loadPosts(true);
  }, [type, loadPosts]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadPosts(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, loading, loadPosts]);

  // Poll for new posts (only for "recent" feed)
  useEffect(() => {
    if (type !== "recent") return;

    const interval = setInterval(async () => {
      try {
        // Fetch just the latest post to check ID
        const res = await fetch(`${endpoint}?limit=1`);
        if (res.ok) {
          const data: FeedResponse = await res.json();
          if (data.posts.length > 0) {
            const latestId = data.posts[0].id;
            // If we have a latest post and the server has a different one, assume it's new
            // (This is a simple check; for exact count we'd need a more complex API)
            if (latestPostIdRef.current && latestId !== latestPostIdRef.current) {
              // We don't know exactly how many, but we know there's at least one.
              // For now, just show "New posts available" or increment a counter if we tracked it better.
              // Let's just set it to 1+ to show the indicator.
              setNewPostsCount(prev => prev + 1);
              // Update ref so we don't keep incrementing for the same new post
              latestPostIdRef.current = latestId;
            }
          }
        }
      } catch (e) {
        // Silent fail for polling
      }
    }, 60000); // Check every 60s

    return () => clearInterval(interval);
  }, [type, endpoint]);

  const handleRefresh = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    loadPosts(true);
  };

  if (loading) {
    return <PostSkeletonList count={4} />;
  }

  if (error) {
    return (
      <div className="thread-module p-4 sm:p-5 md:p-6">
        <div className="text-thread-sunset bg-red-50 border border-red-200 p-3 rounded-cozy">
          <span className="thread-label">error</span>
          <p className="mt-1">{error}</p>
          <button
            onClick={() => loadPosts(true)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
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
    <div className="space-y-0 relative">
      {/* New Posts Indicator */}
      {newPostsCount > 0 && (
        <div className="sticky top-4 z-20 flex justify-center mb-4 pointer-events-none">
          <button
            onClick={handleRefresh}
            className="pointer-events-auto bg-thread-pine text-white px-4 py-2 rounded-full shadow-lg hover:bg-thread-pine/90 transition-all transform hover:scale-105 flex items-center gap-2 font-medium text-sm animate-bounce-in"
          >
            <span>↑ New posts available</span>
          </button>
        </div>
      )}

      {posts.map((post) => (
        <FeedPost
          key={post.id}
          post={post}
          showActivity={type === "active"}
        />
      ))}

      {/* Infinite Scroll Sentinel */}
      <div ref={observerTarget} className="h-10 flex items-center justify-center py-6">
        {loadingMore && (
          <div className="flex items-center gap-2 text-thread-sage">
            <div className="w-2 h-2 bg-thread-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-thread-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-thread-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <span className="thread-label opacity-60">
            You&apos;re all caught up!
          </span>
        )}
      </div>
    </div>
  );
}