import { useEffect, useMemo, useState } from "react";

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { id?: string | null; handle?: string | null; avatarUrl?: string | null } | null;
};

type CommentListProps = {
  postId: string;
  version?: number;
  onLoaded?: (count: number) => void;
  optimistic?: CommentWire[];
  canModerate?: boolean;
  onRemoved?: (id: string) => void;
};

export default function CommentList({
  postId,
  version = 0,
  onLoaded,
  optimistic = [],
  canModerate = false,
  onRemoved,
}: CommentListProps) {
  const [serverComments, setServerComments] = useState<CommentWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

   useEffect(() => {
      let cancelled = false;
      (async () => {
          try {
          const r = await fetch("/api/auth/me", { credentials: "same-origin" });
          if (!r.ok) return;
          const d = await r.json().catch(() => null);
          const v =
              d?.userId ??
              d?.user?.id ??
              d?.id ??
              d?.me?.id ??
              null;
          if (!cancelled && v) setViewerId(String(v));
          } catch {}
      })();
      return () => { cancelled = true; };
    }, []);

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
    return () => { cancelled = true; };
  }, [postId, version]);

  useEffect(() => {
    onLoaded?.(serverComments.length);
  }, [serverComments.length, onLoaded]);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: CommentWire[] = [];
    for (const c of optimistic) if (c?.id && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
    for (const c of serverComments) if (c?.id && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
    return out;
  }, [optimistic, serverComments]);

  const visible = merged.filter((c) => !hiddenIds.has(c.id));

  const handleRemove = async (id: string) => {
    setHiddenIds((s) => { const n = new Set(s); n.add(id); return n; });
    setRemoving(id);
    try {
      const r = await fetch("/api/comments/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });
      if (!r.ok) {
        setHiddenIds((s) => { const n = new Set(s); n.delete(id); return n; });
      } else {
        onRemoved?.(id);
      }
    } finally {
      setRemoving(null);
    }
  };

  if (loading && visible.length === 0) return <div className="text-sm opacity-70 px-1">Loading comments…</div>;
  if (visible.length === 0) return <div className="text-sm opacity-70 px-1">Be the first to comment.</div>;

  return (
    <div className="space-y-3">
      {visible.map((c) => {
        const canDelete = canModerate || (!!viewerId && c.author?.id === viewerId);
        return (
          <div key={c.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-2 mb-1">
              {c.author?.avatarUrl ? (
                <img src={c.author.avatarUrl} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
              ) : null}
              <span className="font-semibold">{c.author?.handle ?? "anon"}</span>
              <span className="text-xs opacity-70 ml-auto">
                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
              </span>
              {canDelete && (
                <button
                  className="ml-2 border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs disabled:opacity-50"
                  onClick={() => handleRemove(c.id)}
                  disabled={removing === c.id}
                  aria-busy={removing === c.id}
                  title={c.author?.id === viewerId ? "Delete your comment" : "Remove comment"}
                >
                  {removing === c.id ? "Removing…" : (c.author?.id === viewerId ? "Delete" : "Remove")}
                </button>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
          </div>
        );
      })}
    </div>
  );
}
