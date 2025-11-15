import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import NewCommentForm from "../../ui/forms/NewCommentForm";
import ImprovedBadgeDisplay from "../../shared/ImprovedBadgeDisplay";
import ReportButton from "../../ui/feedback/ReportButton";
import ConfirmModal from "../../ui/feedback/ConfirmModal";
import { CommentMarkupWithEmojis } from "@/lib/comment-markup";
import UserMention from "@/components/ui/navigation/UserMention";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { id?: string | null; handle?: string | null; avatarUrl?: string | null } | null;
  parentId?: string | null;
  status?: string;
  replies?: CommentWire[];
};

type CommentListProps = {
  postId: string;
  version?: number;
  onLoaded?: (count: number) => void;
  optimistic?: CommentWire[];
  canModerate?: boolean;
  isAdmin?: boolean;
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
  onCommentAdded,
  highlightCommentId,
}: CommentListProps) {
  const [serverComments, setServerComments] = useState<CommentWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; useAdminEndpoint: boolean } | null>(null);

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
    // Only count visible comments (exclude deleted/hidden)
    const visibleCount = serverComments.filter(c => c.status !== 'hidden').length;
    onLoaded?.(visibleCount);
  }, [serverComments, onLoaded]);

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
    // Don't filter by hiddenIds - let status: "hidden" handle visibility in rendering
    const filtered = merged;
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

    // Helper to check if a comment or any descendant has visible content
    const hasVisibleContent = (comment: CommentWire): boolean => {
      // If the comment itself is visible, return true
      if (comment.status !== 'hidden') return true;
      // If deleted, check if any children have visible content
      return comment.replies?.some(hasVisibleContent) ?? false;
    };

    // Build the tree and filter out:
    // 1. Deleted leaf comments (deleted with no children)
    // 2. Entire subtrees where root + all descendants are deleted
    const tree = buildTree(topLevel);
    return tree.filter(hasVisibleContent);
  }, [merged]);

  const handleReply = (comment: CommentWire) => {
    onCommentAdded?.(comment);
    setReplyingTo(null);
  };

  const initiateDelete = (id: string, useAdminEndpoint = false) => {
    setConfirmDelete({ id, useAdminEndpoint });
  };

  const handleRemove = async (id: string, useAdminEndpoint = false) => {
    setRemoving(id);

    // Optimistically update the comment status to "hidden" in local state
    setServerComments((prevComments) =>
      prevComments.map((c) =>
        c.id === id ? { ...c, status: "hidden" } : c
      )
    );

    try {
      const endpoint = useAdminEndpoint ? "/api/admin/delete-comment" : "/api/comments/remove";
      const method = useAdminEndpoint ? "DELETE" : "POST";

      const r = await csrfFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });

      if (!r.ok) {
        // Revert the optimistic update on failure
        setServerComments((prevComments) =>
          prevComments.map((c) =>
            c.id === id ? { ...c, status: "visible" } : c
          )
        );
      } else {
        // Re-fetch comments to get authoritative state from server
        // This ensures consistency, especially for admin deletes
        try {
          const res = await fetch(`/api/comments/${encodeURIComponent(postId)}`);
          const data = res.ok ? await res.json() : { comments: [] };
          setServerComments(Array.isArray(data.comments) ? data.comments : []);
        } catch (error) {
          console.error("Failed to refresh comments after deletion:", error);
        }
      }
    } finally {
      setRemoving(null);
    }
  };

  if (loading && commentTree.length === 0) return <div className="text-sm opacity-70 px-1">Loading comments…</div>;
  if (commentTree.length === 0) return <div className="text-sm opacity-70 px-1">Be the first to comment.</div>;

  const renderComment = (comment: CommentWire, depth = 0): React.ReactNode => {
    const isDeleted = comment.status === 'hidden';
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
                {!isDeleted ? (
                  <>
                    {comment.author?.avatarUrl ? (
                      <Image src={comment.author.avatarUrl} alt="" width={32} height={32} className="comment-avatar w-8 h-8 md:w-6 md:h-6 rounded-full" unoptimized={comment.author.avatarUrl?.endsWith('.gif')} />
                    ) : null}
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {comment.author?.handle ? (
                        <span title={comment.author.handle}>
                          <UserMention
                            username={comment.author.handle.split('@')[0]}
                            className="comment-author-name font-semibold text-sm md:text-base user-link truncate max-w-[180px]"
                          />
                        </span>
                      ) : (
                        <span className="comment-author-name font-semibold text-sm md:text-base">anon</span>
                      )}
                      {comment.author?.id && (
                        <div className="flex-shrink-0">
                          <ImprovedBadgeDisplay
                            userId={comment.author.id}
                            context="comments"
                            layout="inline"
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="comment-author-name font-semibold text-sm md:text-base text-gray-500">[deleted]</span>
                )}
              </div>
              <span className="comment-timestamp text-xs text-gray-600 opacity-70 whitespace-nowrap flex-shrink-0">
                {comment.createdAt ? formatTimeAgo(new Date(comment.createdAt)) : ""}
              </span>
            </div>
            
            {/* Desktop header (original layout) */}
            <div className="hidden md:flex md:items-center md:gap-2 md:w-full">
              {!isDeleted ? (
                <>
                  {comment.author?.avatarUrl ? (
                    <Image src={comment.author.avatarUrl} alt="" width={24} height={24} className="w-6 h-6 rounded-full" unoptimized={comment.author.avatarUrl?.endsWith('.gif')} />
                  ) : null}
                  <div className="flex items-center">
                    {comment.author?.handle ? (
                      <UserMention
                        username={comment.author.handle.split('@')[0]}
                        className="font-semibold user-link"
                      />
                    ) : (
                      <span className="font-semibold">anon</span>
                    )}
                    {comment.author?.id && (
                      <div className="flex-shrink-0">
                        <ImprovedBadgeDisplay
                          userId={comment.author.id}
                          context="comments"
                          layout="inline"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <span className="font-semibold text-gray-500">[deleted]</span>
              )}
              <span className="text-xs text-gray-600 opacity-70 ml-auto">
                {comment.createdAt ? formatTimeAgo(new Date(comment.createdAt)) : ""}
              </span>
              {!isDeleted && depth < maxDepth && (
                <button
                  className="border border-black px-2 py-0.5 bg-white hover:bg-blue-100 shadow-[2px_2px_0_#000] text-xs"
                  onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                >
                  {isReplying ? "Cancel" : "Reply"}
                </button>
              )}
              {!isDeleted && canDelete && (
                <button
                  className="ml-2 border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs disabled:opacity-50"
                  onClick={() => initiateDelete(comment.id)}
                  disabled={removing === comment.id}
                  aria-busy={removing === comment.id}
                  title={isOwner ? "Delete your comment" : "Remove comment"}
                >
                  {removing === comment.id ? "Removing…" : (isOwner ? "Delete" : "Remove")}
                </button>
              )}
              {!isDeleted && canAdminDelete && (
                <button
                  className="ml-2 border border-black px-2 py-0.5 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs disabled:opacity-50"
                  onClick={() => initiateDelete(comment.id, true)}
                  disabled={removing === comment.id}
                  aria-busy={removing === comment.id}
                  title="Admin: Delete comment"
                >
                  {removing === comment.id ? "Deleting…" : "🛡️ Delete"}
                </button>
              )}

              {/* Report Button - show for non-owners */}
              {!isDeleted && !isOwner && comment.author?.id && (
                <ReportButton
                  reportType="comment"
                  targetId={comment.id}
                  reportedUserId={comment.author.id}
                  contentPreview={comment.content.length > 100 ? comment.content.substring(0, 100) + "..." : comment.content}
                  size="desktop"
                  className="ml-2 border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs"
                />
              )}
            </div>

            {/* Mobile action buttons */}
            {!isDeleted && (
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
                      onClick={() => initiateDelete(comment.id)}
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
                      onClick={() => initiateDelete(comment.id, true)}
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
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="comment-content text-sm md:text-sm leading-relaxed text-gray-700">
            {comment.status === 'hidden' ? (
              <div className="text-gray-500 italic">[Comment removed]</div>
            ) : (
              <CommentMarkupWithEmojis text={comment.content} />
            )}
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
    <>
      <div className="space-y-3">
        {commentTree.map(comment => renderComment(comment))}
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (confirmDelete) {
            await handleRemove(confirmDelete.id, confirmDelete.useAdminEndpoint);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
