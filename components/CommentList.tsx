import { useEffect, useMemo, useState } from "react";

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { handle?: string | null; avatarUrl?: string | null } | null;
};

type CommentListProps = {
  postId: string;
  /** Optional: bump to refetch from server */
  version?: number;
  /** Optional: report total count back up */
  onLoaded?: (count: number) => void;
  /** Optimistically added comments (from parent) to show immediately */
  optimistic?: CommentWire[];
};

export default function CommentList({
  postId,
  version = 0,
  onLoaded,
  optimistic = [],
}: CommentListProps) {
  const [serverComments, setServerComments] = useState<CommentWire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/comments/${encodeURIComponent(postId)}`);
      const data = res.ok ? await res.json() : { comments: [] };
      if (!cancelled) {
        setServerComments(Array.isArray(data.comments) ? data.comments : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, version]);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: CommentWire[] = [];
    for (const c of optimistic) {
      if (!c?.id) continue;
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    for (const c of serverComments) {
      if (!c?.id) continue;
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    return out;
  }, [optimistic, serverComments]);

  useEffect(() => {
    onLoaded?.(serverComments.length);
  }, [serverComments.length, onLoaded]);

  if (loading && merged.length === 0) {
    return <div className="text-sm opacity-70 px-1">Loading comments…</div>;
  }
  if (merged.length === 0) {
    return <div className="text-sm opacity-70 px-1">Be the first to comment.</div>;
  }

  return (
    <div className="space-y-3">
      {merged.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            {c.author?.avatarUrl ? (
              <img src={c.author.avatarUrl} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
            ) : null}
            <span className="font-semibold">{c.author?.handle ?? "anon"}</span>
            <span className="text-xs opacity-70 ml-auto">
              {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
        </div>
      ))}
    </div>
  );
}
