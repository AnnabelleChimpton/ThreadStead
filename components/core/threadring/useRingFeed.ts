import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import type { PostChange } from "@/components/core/content/PostItem";

export type FeedScope = "current" | "parent" | "children" | "siblings" | "family";

const COULD_NOT_LOAD = "Couldn't load posts. Try again in a minute.";

/**
 * A ring's posts for one scope, a page at a time. A new scope starts over and
 * cancels the read still in flight, so a slow answer can't land on top of a
 * newer one. A changed post is patched where it sits, so the pages already
 * loaded and the scope stay put.
 */
export function useRingFeed(slug: string) {
  const { showError } = useToast();
  const [scope, setScope] = useState<FeedScope>("current");
  const [posts, setPosts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  // Where the next hub page starts (the API's nextOffset; it counts PostRefs, not shown posts)
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);

  const readPage = useCallback(
    async (offset: number, signal: AbortSignal) => {
      const response = await fetch(
        `/api/threadrings/${encodeURIComponent(slug)}/posts?scope=${scope}&offset=${offset}`,
        { signal }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || COULD_NOT_LOAD);
      return data;
    },
    [slug, scope]
  );

  useEffect(() => {
    const controller = new AbortController();
    current.current = controller;
    setLoading(true);
    setError(null);
    setPosts([]);
    setHasMore(false);
    readPage(0, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPosts(data.posts || []);
        setHasMore(!!data.hasMore);
        setNextOffset(data.nextOffset ?? 0);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message || COULD_NOT_LOAD);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [readPage]);

  async function loadMore() {
    const controller = current.current;
    if (!controller || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await readPage(nextOffset, controller.signal);
      if (controller.signal.aborted) return;
      setPosts((shown) => {
        const seen = new Set(shown.map((post) => post.id));
        return [...shown, ...(data.posts || []).filter((post: any) => !seen.has(post.id))];
      });
      setHasMore(!!data.hasMore);
      setNextOffset(data.nextOffset ?? nextOffset);
    } catch (e: any) {
      if (!controller.signal.aborted) showError(e.message || COULD_NOT_LOAD);
    } finally {
      setLoadingMore(false);
    }
  }

  /** After a post's menu acted on it: drop it, flip its pin, or read just that post again. */
  async function postChanged(postId: string, change?: PostChange) {
    const without = () => setPosts((shown) => shown.filter((post) => post.id !== postId));
    if (change && "removed" in change) return without();
    if (change && "isPinned" in change) {
      setPosts((shown) => shown.map((post) => (post.id === postId ? { ...post, isPinned: change.isPinned } : post)));
      return;
    }
    // Edited, deleted, or added to another ring
    try {
      const response = await fetch(`/api/posts/single/${encodeURIComponent(postId)}`);
      if (response.status === 404 || response.status === 403) return without();
      if (!response.ok) return;
      const { post: fresh } = await response.json();
      setPosts((shown) =>
        shown.map((post) =>
          post.id === postId
            ? {
                ...post,
                title: fresh.title,
                bodyHtml: fresh.bodyHtml,
                bodyMarkdown: fresh.bodyMarkdown,
                visibility: fresh.visibility,
                tags: fresh.tags,
                isSpoiler: fresh.isSpoiler,
                contentWarning: fresh.contentWarning,
                threadRings: fresh.threadRings ?? post.threadRings,
                updatedAt: fresh.updatedAt,
              }
            : post
        )
      );
    } catch {
      // The post as shown is still right enough; the next visit reads it fresh
    }
  }

  return { scope, setScope, posts, hasMore, loading, loadingMore, error, loadMore, postChanged };
}
