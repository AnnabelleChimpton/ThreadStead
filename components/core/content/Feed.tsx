import React, { useState, useEffect, useCallback, useRef } from "react";
import FeedPost, { FeedPostData } from "./FeedPost";
import { PostSkeletonList } from "./PostSkeleton";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";

type FeedType = "recent" | "active" | "following";

const ENDPOINTS: Record<FeedType, string> = {
  recent: "/api/feed/recent",
  active: "/api/feed/active",
  following: "/api/feed/following",
};

type FeedProps = {
  type: FeedType;
};

type FeedResponse = {
  posts: FeedPostData[];
  hasMore: boolean;
  /** Following feed only: keyset cursor for the next page */
  nextCursor?: string | null;
  /** Following feed only: how many people the viewer follows */
  followingCount?: number;
};

export default function Feed({ type }: FeedProps) {
  const { config } = useSiteConfig();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  const postsCountRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const latestPostIdRef = useRef<string | null>(null);
  const cursorRef = useRef<string | null>(null);

  const endpoint = ENDPOINTS[type];

  const loadPosts = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoadingMore(true);
    setError(null);

    try {
      let query = "limit=10";
      if (type === "following") {
        if (!isInitial && cursorRef.current) query += `&cursor=${encodeURIComponent(cursorRef.current)}`;
      } else {
        query += `&offset=${isInitial ? 0 : postsCountRef.current}`;
      }
      const res = await fetch(`${endpoint}?${query}`);

      if (!res.ok) {
        throw new Error("Failed to load posts");
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

      cursorRef.current = data.nextCursor ?? null;
      if (typeof data.followingCount === "number") setFollowingCount(data.followingCount);
      setHasMore(data.hasMore);
    } catch (err) {
      setError((err as Error)?.message || "Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [endpoint, type]);

  // Load initial posts
  useEffect(() => {
    postsCountRef.current = 0;
    cursorRef.current = null;
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

  // Poll for new posts (newest-first feeds only)
  useEffect(() => {
    if (type === "active") return;

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
    return <ErrorDisplay title={error} onRetry={() => loadPosts(true)} />;
  }

  if (posts.length === 0 && type === "following") {
    const followsNobody = followingCount === 0;
    return (
      <EmptyState
        title={followsNobody ? "You\u2019re not following anyone yet" : "Nothing new from the people you follow"}
        description={followsNobody
          ? "Follow a few neighbors and their posts will show up here."
          : "When they post, you\u2019ll see it here."}
        actions={
          <>
            <ButtonLink href="/neighborhood">Walk down the street</ButtonLink>
            <ButtonLink href="/neighborhood/residents" variant="secondary">Browse residents</ButtonLink>
          </>
        }
      />
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        description={type === "recent" ? config.feed_empty_message : "No posts with recent activity found."}
      />
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
          showVisibility={type === "following"}
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