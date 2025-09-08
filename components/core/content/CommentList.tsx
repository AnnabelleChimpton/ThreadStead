import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import NewCommentForm from "../../ui/forms/NewCommentForm";
import ImprovedBadgeDisplay from "../../shared/ImprovedBadgeDisplay";
import ReportButton from "../../ui/feedback/ReportButton";
import { CommentMarkupWithEmojis } from "@/lib/comment-markup";

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
  isAdmin?: boolean;
  onRemoved?: (id: string) => void;
  onCommentAdded?: (comment: CommentWire) => void;
  highlightCommentId?: string | null;
};

export default function CommentList({
  postId,
  version = 0,
  onLoaded,
  optimistic = [],
  canModerate = false,
  isAdmin = false,
  onRemoved,
  onCommentAdded,
  highlightCommentId,
}: CommentListProps) {
  const [serverComments, setServerComments] = useState<CommentWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Auto-scroll to highlighted comment
  useEffect(() => {
    if (highlightCommentId && !loading && serverComments.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // Small delay to ensure DOM is updated
      return () => clearTimeout(timer);
    }
  }, [highlightCommentId, loading, serverComments.length]);

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
    
    // Add all unique comments from both sources
    for (const c of optimistic) if (c?.id && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
    for (const c of serverComments) if (c?.id && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
    
    // Sort by creation time to maintain proper threading order
    return out.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
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

    // Sort replies within each parent group by creation time
    Object.keys(byParent).forEach(parentId => {
      byParent[parentId].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    });

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

  const handleRemove = async (id: string, useAdminEndpoint = false) => {
    setHiddenIds((s) => { const n = new Set(s); n.add(id); return n; });
    setRemoving(id);
    try {
      const endpoint = useAdminEndpoint ? "/api/admin/delete-comment" : "/api/comments/remove";
      const method = useAdminEndpoint ? "DELETE" : "POST";
      
      const r = await fetch(endpoint, {
        method,
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
    const isOwner = !!viewerId && comment.author?.id === viewerId;
    const canDelete = canModerate || isOwner;
    const canAdminDelete = isAdmin && !isOwner;
    const maxDepth = 3; // Limit nesting depth
    const isReplying = replyingTo === comment.id;
    const isHighlighted = highlightCommentId === comment.id;

    // Dynamic classes for mobile/desktop
    const threadClass = depth > 0 
      ? `comment-thread comment-thread-depth-${Math.min(depth, 5)} ml-6 md:ml-6 border-l-2 border-thread-sage/20 pl-4 md:pl-4`
      : '';

    return (
      <div key={comment.id} className={threadClass}>
        <div 
          id={`comment-${comment.id}`}
          className={`comment-container rounded-xl border p-3 md:p-3 transition-all duration-300 ${
            isHighlighted 
              ? 'comment-highlighted border-yellow-400 md:border-yellow-400 bg-yellow-50 md:bg-yellow-50 shadow-lg ring-2 ring-yellow-200' 
              : 'border-white/10'
          }`}
        >
          {/* Mobile-optimized header */}
          <div className="comment-header flex md:flex-row items-center md:items-center gap-2 mb-1 md:mb-1">
            <div className="comment-header-top md:hidden w-full">
              <div className="comment-author-info flex items-center gap-2 flex-wrap">
                {comment.author?.avatarUrl ? (
                  <Image src={comment.author.avatarUrl} alt="" width={32} height={32} className="comment-avatar w-8 h-8 md:w-6 md:h-6 rounded-full" />
                ) : null}
                <div className="flex items-center flex-wrap">
                  <span className="comment-author-name font-semibold text-sm md:text-base">{comment.author?.handle ?? "anon"}</span>
                  {comment.author?.id && (
                    <ImprovedBadgeDisplay 
                      userId={comment.author.id} 
                      context="comments" 
                      layout="inline"
                    />
                  )}
                </div>
              </div>
              <span className="comment-timestamp text-xs opacity-70">
                {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
              </span>
            </div>
            
            {/* Desktop header (original layout) */}
            <div className="hidden md:flex md:items-center md:gap-2 md:w-full">
              {comment.author?.avatarUrl ? (
                <Image src={comment.author.avatarUrl} alt="" width={24} height={24} className="w-6 h-6 rounded-full" />
              ) : null}
              <div className="flex items-center">
                <span className="font-semibold">{comment.author?.handle ?? "anon"}</span>
                {comment.author?.id && (
                  <ImprovedBadgeDisplay 
                    userId={comment.author.id} 
                    context="comments" 
                    layout="tooltip"
                  />
                )}
              </div>
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
                  title={isOwner ? "Delete your comment" : "Remove comment"}
                >
                  {removing === comment.id ? "Removing…" : (isOwner ? "Delete" : "Remove")}
                </button>
              )}
              {canAdminDelete && (
                <button
                  className="ml-2 border border-black px-2 py-0.5 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs disabled:opacity-50"
                  onClick={() => handleRemove(comment.id, true)}
                  disabled={removing === comment.id}
                  aria-busy={removing === comment.id}
                  title="Admin: Delete comment"
                >
                  {removing === comment.id ? "Deleting…" : "🛡️ Delete"}
                </button>
              )}
              
              {/* Report Button - show for non-owners */}
              {!isOwner && comment.author?.id && (
                <div className="ml-2">
                  <ReportButton
                    reportType="comment"
                    targetId={comment.id}
                    reportedUserId={comment.author.id}
                    contentPreview={comment.content.length > 100 ? comment.content.substring(0, 100) + "..." : comment.content}
                    size="small"
                  />
                </div>
              )}
            </div>

            {/* Mobile action buttons */}
            <div className="comment-header-bottom md:hidden w-full">
              <div className="comment-actions">
                {depth < maxDepth && (
                  <button
                    className="comment-button"
                    onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                  >
                    {isReplying ? "Cancel" : "Reply"}
                  </button>
                )}
                {canDelete && (
                  <button
                    className="comment-button comment-button-delete"
                    onClick={() => handleRemove(comment.id)}
                    disabled={removing === comment.id}
                    aria-busy={removing === comment.id}
                    title={isOwner ? "Delete your comment" : "Remove comment"}
                  >
                    {removing === comment.id ? "Removing…" : (isOwner ? "Delete" : "Remove")}
                  </button>
                )}
                {canAdminDelete && (
                  <button
                    className="comment-button comment-button-delete bg-red-200"
                    onClick={() => handleRemove(comment.id, true)}
                    disabled={removing === comment.id}
                    aria-busy={removing === comment.id}
                    title="Admin: Delete comment"
                  >
                    {removing === comment.id ? "Deleting…" : "🛡️ Delete"}
                  </button>
                )}
                
                {/* Report Button - mobile version */}
                {!isOwner && comment.author?.id && (
                  <ReportButton
                    reportType="comment"
                    targetId={comment.id}
                    reportedUserId={comment.author.id}
                    contentPreview={comment.content.length > 100 ? comment.content.substring(0, 100) + "..." : comment.content}
                    size="small"
                    className="comment-button"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="comment-content text-sm md:text-sm leading-relaxed">
            <CommentMarkupWithEmojis text={comment.content} />
          </div>
          
          {isReplying && (
            <div className="comment-form mt-3 pt-3 border-t border-white/10 md:border-white/10">
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
