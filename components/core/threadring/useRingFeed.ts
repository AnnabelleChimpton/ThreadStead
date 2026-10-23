import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import type { Post, PostChange } from "@/components/core/content/PostItem";

/** The posts API's scopes: which rings' posts a page holds. */
export type FeedScope = "current" | "parent" | "children" | "siblings" | "family";

const COULD_NOT_LOAD = "Couldn't load posts. Try again in a minute.";

/** One scope's place in the feed: where its next page starts, and posts read but not shown yet. */
interface Stream {
  scope: FeedScope;
  offset: number;
  hasMore: boolean;
  waiting: Post[];
}

const postedAt = (post: Post) => Date.parse(post.ringHubData?.submittedAt ?? post.createdAt) || 0;

/**
 * A ring's posts, a page at a time: "This ring" alone, or "with" its
 * relatives, read from the scopes in `withScopes` and merged newest first.
 * Switching starts over and cancels the read still in flight, so a slow
 * answer can't land on top of a newer one. A changed post is patched where it
 * sits, so the pages already loaded stay put.
 */
export function useRingFeed(slug: string, withScopes: FeedScope[] = ["family"]) {
  const { showError } = useToast();
  const [scope, setScope] = useState<"current" | "with">("current");
  const [posts, setPosts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<{ controller: AbortController; streams: Stream[] } | null>(null);
  const scopesKey = (scope === "current" ? ["current"] : withScopes).join(",");

  const readPage = useCallback(
    async (stream: Stream, signal: AbortSignal) => {
      const response = await fetch(
        `/api/threadrings/${encodeURIComponent(slug)}/posts?scope=${stream.scope}&offset=${stream.offset}`,
        { signal }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || COULD_NOT_LOAD);
      const next = data.nextOffset ?? stream.offset;
      stream.waiting.push(...(data.posts || []));
      // A page that doesn't move on would be read forever
      stream.hasMore = !!data.hasMore && next > stream.offset;
      stream.offset = next;
    },
    [slug]
  );

  /**
   * The next posts across the streams, newest first. A stream whose waiting
   * posts run out is read again only before anything is taken, so one page
   * is one read per stream at most and the order never skips a newer post.
   */
  const nextPage = useCallback(
    async (streams: Stream[], signal: AbortSignal, seen: Set<string>) => {
      const page: Post[] = [];
      for (;;) {
        const dry = streams.filter((stream) => stream.waiting.length === 0 && stream.hasMore);
        if (dry.length > 0) {
          if (page.length > 0) break;
          await Promise.all(dry.map((stream) => readPage(stream, signal)));
          continue;
        }
        const ready = streams.filter((stream) => stream.waiting.length > 0);
        if (ready.length === 0) break;
        const newest = ready.reduce((a, b) => (postedAt(b.waiting[0]) > postedAt(a.waiting[0]) ? b : a));
        const post = newest.waiting.shift()!;
        // A post in this ring and a branch is shown once
        if (!seen.has(post.id)) {
          seen.add(post.id);
          page.push(post);
        }
      }
      return { page, more: streams.some((stream) => stream.waiting.length > 0 || stream.hasMore) };
    },
    [readPage]
  );

  useEffect(() => {
    const controller = new AbortController();
    const streams: Stream[] = scopesKey.split(",").map((s) => ({ scope: s as FeedScope, offset: 0, hasMore: true, waiting: [] }));
    current.current = { controller, streams };
    setLoading(true);
    setError(null);
    setPosts([]);
    setHasMore(false);
    nextPage(streams, controller.signal, new Set())
      .then(({ page, more }) => {
        if (controller.signal.aborted) return;
        setPosts(page);
        setHasMore(more);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message || COULD_NOT_LOAD);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [scopesKey, nextPage]);

  async function loadMore() {
    const feed = current.current;
    if (!feed || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { page, more } = await nextPage(feed.streams, feed.controller.signal, new Set(posts.map((post) => post.id)));
      if (feed.controller.signal.aborted) return;
      setPosts((shown) => [...shown, ...page]);
      setHasMore(more);
    } catch (e: any) {
      if (!feed.controller.signal.aborted) showError(e.message || COULD_NOT_LOAD);
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
