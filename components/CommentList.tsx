import { useEffect, useMemo, useState } from "react";
import NewCommentForm from "./NewCommentForm";

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { id?: string | null; handle?: string | null; avatarUrl?: string | null } | null;
  parentId?: string | null;
  replies?: CommentWire[];
};

type CommentListProps = {
  postId: string;
  version?: number;
  onLoaded?: (count: number) => void;
  optimistic?: CommentWire[];
  canModerate?: boolean;
  onRemoved?: (id: string) => void;
  onCommentAdded?: (comment: CommentWire) => void;
};

export default function CommentList({
  postId,
  version = 0,
  onLoaded,
  optimistic = [],
  canModerate = false,
  onRemoved,
  onCommentAdded,
}: CommentListProps) {
  const [serverComments, setServerComments] = useState<CommentWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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

  // Build nested comment tree
  const commentTree = useMemo(() => {
    const filtered = merged.filter((c) => !hiddenIds.has(c.id));
    const topLevel: CommentWire[] = [];
    const byParent: Record<string, CommentWire[]> = {};

    // Group comments by parentId
    for (const comment of filtered) {
      if (!comment.parentId) {
        topLevel.push(comment);
      } else {
        if (!byParent[comment.parentId]) {
          byParent[comment.parentId] = [];
        }
        byParent[comment.parentId].push(comment);
      }
    }

    // Recursively build tree
    const buildTree = (comments: CommentWire[]): CommentWire[] => {
      return comments.map(comment => ({
        ...comment,
        replies: byParent[comment.id] ? buildTree(byParent[comment.id]) : []
      }));
    };

    return buildTree(topLevel);
  }, [merged, hiddenIds]);

  const handleReply = (comment: CommentWire) => {
    onCommentAdded?.(comment);
    setReplyingTo(null);
  };

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

  if (loading && commentTree.length === 0) return <div className="text-sm opacity-70 px-1">Loading comments…</div>;
  if (commentTree.length === 0) return <div className="text-sm opacity-70 px-1">Be the first to comment.</div>;

  const renderComment = (comment: CommentWire, depth = 0): React.ReactNode => {
    const canDelete = canModerate || (!!viewerId && comment.author?.id === viewerId);
    const maxDepth = 3; // Limit nesting depth
    const isReplying = replyingTo === comment.id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-thread-sage/20 pl-4' : ''}`}>
        <div className="rounded-xl border border-white/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            {comment.author?.avatarUrl ? (
              <img src={comment.author.avatarUrl} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
            ) : null}
            <span className="font-semibold">{comment.author?.handle ?? "anon"}</span>
            <span className="text-xs opacity-70 ml-auto">
              {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
            </span>
            {depth < maxDepth && (
              <button
                className="border border-black px-2 py-0.5 bg-white hover:bg-blue-100 shadow-[2px_2px_0_#000] text-xs"
                onClick={() => setReplyingTo(isReplying ? null : comment.id)}
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            )}
            {canDelete && (
              <button
                className="ml-2 border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs disabled:opacity-50"
                onClick={() => handleRemove(comment.id)}
                disabled={removing === comment.id}
                aria-busy={removing === comment.id}
                title={comment.author?.id === viewerId ? "Delete your comment" : "Remove comment"}
              >
                {removing === comment.id ? "Removing…" : (comment.author?.id === viewerId ? "Delete" : "Remove")}
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          
          {isReplying && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <NewCommentForm 
                postId={postId} 
                parentId={comment.id}
                onCommentAdded={handleReply}
                placeholder={`Reply to ${comment.author?.handle ?? "anon"}...`}
              />
            </div>
          )}
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {commentTree.map(comment => renderComment(comment))}
    </div>
  );
}
