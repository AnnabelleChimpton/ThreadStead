import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { TextWithEmojis, HtmlWithEmojis, MarkdownWithEmojis, markdownToSafeHtmlWithEmojis, processHtmlWithEmojis } from "@/lib/comment-markup";
import { truncateText, truncateHtml, needsTruncation } from "@/lib/utils/text-truncation";
import hljs from "highlight.js"; // Ensure highlight.js is imported
import CommentList, { CommentWire as CommentWireList } from "./CommentList";
import NewCommentForm, { CommentWire as CommentWireForm } from "../../ui/forms/NewCommentForm";
import ThreadRingBadge from "../threadring/ThreadRingBadge";
import PostHeader from "./PostHeader";
import { UserWithRole } from "@/lib/utils/features/feature-flags";
import PostModerationActions from "./PostModerationActions";
import { useModerationPermissions } from "@/hooks/useModerationPermissions";
import { PostModerationAction, PostModerationStatus, ThreadRingRole } from "@/types/threadrings";
import ReportButton from "../../ui/feedback/ReportButton";
import PostActionsDropdown from "./PostActionsDropdown";
import { useWelcomeRingTracking } from "@/hooks/useWelcomeRingTracking";
import { useViewportTracking, trackEngagement } from "@/hooks/usePostView";

type Visibility = "public" | "followers" | "friends" | "private";

type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

export type Post = {
  id: string;
  title?: string | null;
  intent?: PostIntent | null;
  createdAt: string; // ISO string from API
  bodyText?: string | null;
  bodyHtml?: string | null;
  bodyMarkdown?: string | null; // Ensure bodyMarkdown is available for edit
  visibility: Visibility;
  
  // Spoiler content warning fields
  isSpoiler?: boolean;
  contentWarning?: string | null;
  
  // Ring Hub metadata alignment (all optional)
  textPreview?: string | null; // Max 300 chars - for social/feed previews
  excerpt?: string | null; // Max 500 chars - for detailed descriptions
  publishedAt?: string | null; // ISO string, can differ from createdAt
  platform?: string | null; // Source platform
  
  // Ring Hub moderation fields
  ringHubPostId?: string | null; // Ring Hub post ID for moderation
  moderationStatus?: PostModerationStatus; // Current moderation status
  moderatedAt?: string | null; // ISO string when moderated
  moderatedBy?: string | null; // DID of moderator
  moderationNote?: string | null; // Moderation reason/note
  
  author?: { id: string; primaryHandle?: string; profile?: { displayName?: string } };
  threadRings?: Array<{
    threadRing: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  isPinned?: boolean;
  pinnedAt?: string | null;
  // Ring Hub data for external posts and special post types
  ringHubData?: {
    id: string;
    ringSlug: string;
    submittedAt: string;
    submittedBy: string;
    status: string;
    pinned: boolean;
    metadata?: any;
    isNotification?: boolean;
    notificationType?: string;
  };
};



export default function PostItem({
  post,
  isOwner,
  isAdmin = false,
  onChanged,
  highlightCommentId,
  initialCommentsOpen = false,
  threadRingContext = null,
  canModerateRing = false,
  currentUser,
  userRole,
  isUserMember = false,
  viewContext,
}: {
  post: Post;
  isOwner: boolean;
  isAdmin?: boolean;
  onChanged?: () => void | Promise<void>;
  highlightCommentId?: string | null;
  initialCommentsOpen?: boolean;
  currentUser?: UserWithRole | null;
  threadRingContext?: { slug: string; name: string } | null;
  canModerateRing?: boolean;
  userRole?: ThreadRingRole;
  isUserMember?: boolean;
  viewContext?: 'feed' | 'profile' | 'ring' | 'widget';
}) {
  const router = useRouter();

  // Helper function to check if post has spoiler content from any source
  const isSpoilerPost = () => {
    // Check both the main post field and RingHub metadata
    return post.isSpoiler || post.ringHubData?.metadata?.isSpoiler || false;
  };

  // Helper function to get spoiler warning text from any source
  const getSpoilerWarning = () => {
    // Check both the main post field and RingHub metadata
    return post.contentWarning || post.ringHubData?.metadata?.contentWarning || null;
  };

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<CommentWireList[]>([]);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Enable truncation for feed/list views, disable for individual post pages
  // When viewContext is undefined, we're on an individual post page (no truncation)
  // When viewContext is defined (feed/profile/ring/widget), we're in a list view (truncate)
  const shouldEnableTruncation = viewContext !== undefined;

  // Ring Hub moderation permissions
  const moderationPermissions = useModerationPermissions(userRole, isUserMember);
  const showRingHubModeration = threadRingContext && post.ringHubPostId && moderationPermissions.canModerate;
  
  // Welcome ring tracking
  const { trackCommentCreated } = useWelcomeRingTracking(threadRingContext?.slug);

  // Viewport tracking for feed views
  const getViewType = () => {
    if (threadRingContext) return 'ring_view';
    if (viewContext === 'profile') return 'profile_view';
    if (viewContext === 'widget') return 'widget_click';
    return 'feed_view';
  };

  const viewportRef = useViewportTracking(
    post.id,
    getViewType(),
    0.5, // 50% visible
    2000 // 2 seconds
  );


  useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const r = await fetch(`/api/comments/count?postId=${encodeURIComponent(post.id)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (!cancelled && typeof data?.count === "number") {
        setCommentCount(data.count);
      }
    } catch {}
  })();
  return () => { cancelled = true; };
}, [post.id]);

  // callbacks
const handleCommentAdded = (c: CommentWireForm) => {
  // show instantly
  setOptimistic((arr) => [c, ...arr]);
  setCommentsOpen(true);
  
  // Track comment creation for Welcome Ring progress
  trackCommentCreated();

  // optional: kick a background sync next time (or immediately if you prefer)
  // setCommentsVersion((v) => v + 1);
};

const hasServerCount = commentCount !== null;
const countLabel = hasServerCount
  ? String((commentCount ?? 0) + optimistic.length)
  : (optimistic.length ? `${optimistic.length}+` : "…");


  // Function to apply syntax highlighting
  const highlightCodeBlocks = () => {
    const blocks = document.querySelectorAll("pre code");
    blocks.forEach((block) => {
      // Remove the highlighted state before applying highlighting again
      block.removeAttribute("data-highlighted");

      // Apply syntax highlighting
      hljs.highlightElement(block as HTMLElement);
    });
  };

  // UseEffect to apply highlighting on mount
  useEffect(() => {
    highlightCodeBlocks();
  }, []);

  async function mintPostCap(): Promise<string> {
    const capRes = await fetch("/api/cap/post", { method: "POST" });
    if (capRes.status === 401) throw new Error("Please log in.");
    if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
    const { token } = await capRes.json();
    return token;
  }

  function handleEdit() {
    // Navigate to edit page
    const authorUsername = post.author?.primaryHandle?.split('@')[0];
    if (authorUsername) {
      router.push(`/resident/${authorUsername}/post/${post.id}/edit`);
    }
  }

  async function remove() {
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    setErr(null);
    try {
      const token = await mintPostCap();
      const res = await fetch("/api/posts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, cap: token }),
      });
      if (!res.ok) throw new Error(`delete ${res.status}`);

      // Notify parent component that the post was removed
      await onChanged?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  async function adminDelete() {
    if (!confirm("Admin delete this post? This action cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/delete-post", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) throw new Error(`admin delete ${res.status}`);
      
      // Notify parent component that the post was removed
      await onChanged?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }


  async function handlePinToggle() {
    if (!threadRingContext || !canModerateRing) return;
    
    setBusy(true);
    setErr(null);
    try {
      const method = post.isPinned ? "DELETE" : "POST";
      const res = await fetch(`/api/threadrings/${threadRingContext.slug}/posts/${post.id}/pin`, {
        method,
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`pin toggle ${res.status}`);
      
      await onChanged?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to toggle pin");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveFromRing() {
    if (!threadRingContext || !canModerateRing) return;
    if (!confirm(`Remove this post from ${threadRingContext.name}?`)) return;
    
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/threadrings/${threadRingContext.slug}/posts/${post.id}/remove`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`remove ${res.status}`);
      
      await onChanged?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to remove from ThreadRing");
    } finally {
      setBusy(false);
    }
  }

  const handleRingHubModerationAction = async (action: PostModerationAction, reason?: string) => {
    // Refresh the post data to reflect the moderation change
    await onChanged?.();
  };

  return (
    <article
      ref={viewportRef}
      id={`post-${post.id.slice(-6)}`}
      className={`post-item blog-post-card border border-black p-3 bg-white shadow-[2px_2px_0_#000] ${post.isPinned ? 'border-yellow-500 border-2' : ''}`}
      data-post-id={post.id.slice(-6)}
    >
      <div className="blog-post-header flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="blog-post-date text-xs opacity-70">
            {new Date(post.createdAt).toLocaleString()}
          </div>
          {post.isPinned && (
            <span className="text-xs bg-yellow-200 px-2 py-1 border border-black rounded">
              📌 Pinned
            </span>
          )}
        </div>

        <div className="blog-post-actions flex items-center gap-2">
          {/* Check if this is a fork notification - if so, don't show actions dropdown */}
          {(() => {
            const isForkNotification = (post.ringHubData?.metadata?.type === 'fork_notification') ||
                                      (post.ringHubData?.isNotification && post.ringHubData?.notificationType === 'fork_notification');

            return !isForkNotification && (
              <PostActionsDropdown
                post={post}
                isOwner={isOwner}
                isAdmin={isAdmin}
                busy={busy}
                threadRingContext={threadRingContext}
                canModerateRing={canModerateRing}
                onEdit={handleEdit}
                onDelete={remove}
                onAdminDelete={adminDelete}
                onPinToggle={handlePinToggle}
                onRemoveFromRing={handleRemoveFromRing}
              />
            );
          })()}
        </div>
      </div>

      <div className="blog-post-content">
        {/* Check for fork notification */}
        {(() => {
          const isForkNotification = (post.ringHubData?.metadata?.type === 'fork_notification') ||
                                    (post.ringHubData?.isNotification && post.ringHubData?.notificationType === 'fork_notification');

          if (isForkNotification) {
            return (
              <div className="border border-black bg-white p-3 sm:p-4 shadow-[2px_2px_0_#000]">
                <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-yellow-200 border border-black rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm">🍴</span>
                  </div>
                  <div className="flex-1 w-full sm:min-w-0">
                    <div className="mb-2 text-sm sm:text-base break-words">
                      <span className="font-semibold">
                        {post.author?.profile?.displayName || post.author?.primaryHandle || 'Someone'}
                      </span>
                      <span className="text-gray-600"> started a new ring as </span>
                      {(() => {
                        // Handle different metadata structures and extract fork ring information
                        const metadata = post.ringHubData?.metadata || {};
                        const forkedRingData = metadata.forkedRing || {};

                        // Try multiple sources for the ring slug and name
                        let slug = forkedRingData.slug || post.ringHubData?.ringSlug;
                        let name = forkedRingData.name || post.threadRings?.[0]?.threadRing?.name;

                        // If we don't have a name but have a slug, try to derive it
                        if (!name && slug) {
                          // Convert slug to readable name (capitalize and replace hyphens with spaces)
                          name = slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                        }

                        // Final fallback
                        if (!name) name = 'New Ring';
                        if (!slug) slug = '#'; // Fallback for link

                        return (
                          <a
                            href={`/tr/${slug}`}
                            className="font-semibold hover:underline text-black break-words"
                          >
                            {name}
                          </a>
                        );
                      })()}
                    </div>
                    {(() => {
                      const forkedRingData = post.ringHubData?.metadata?.forkedRing || post.ringHubData?.metadata || {};
                      return forkedRingData.description && (
                        <div className="text-xs sm:text-sm text-gray-700 mb-3 italic line-clamp-3 sm:line-clamp-none break-words">
                          &quot;{forkedRingData.description}&quot;
                        </div>
                      );
                    })()}
                    <a
                      href={`/tr/${post.ringHubData?.metadata?.forkedRing?.slug || post.ringHubData?.ringSlug}`}
                      className="block sm:inline-block w-full sm:w-auto text-center text-xs sm:text-sm bg-yellow-200 hover:bg-yellow-300 px-3 py-2 sm:py-1 border border-black shadow-[1px_1px_0_#000] font-medium"
                    >
                      Visit New Ring
                    </a>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <>
                {/* Spoiler Warning - Works for both local and external posts */}
                {isSpoilerPost() && !spoilerRevealed && (
                  <div className="mb-4 p-4 spoiler-warning rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">⚠️</span>
                      <h3 className="font-bold text-lg">Content Warning</h3>
                    </div>
                    {getSpoilerWarning() && (
                      <p className="mb-3 text-sm">{getSpoilerWarning()}</p>
                    )}
                    <button
                      onClick={() => setSpoilerRevealed(true)}
                      className="px-4 py-2 bg-white text-black font-bold border-2 border-black hover:bg-yellow-200 shadow-[2px_2px_0_#000] transition-all"
                    >
                      👁️ Click to Reveal Spoilers
                    </button>
                  </div>
                )}

                {/* Post Header */}
                {post.title && (
                  <div className={isSpoilerPost() && !spoilerRevealed ? 'spoiler-content' : ''}>
                    <PostHeader post={post} currentUser={currentUser} />
                  </div>
                )}

                {/* Post Content */}
                <div className={`thread-content ${isSpoilerPost() && !spoilerRevealed ? 'spoiler-content' : ''}`}>
                  {(() => {
                    // Determine content source and check if truncation is needed
                    const rawContent = post.bodyMarkdown || post.bodyHtml || post.bodyText || "";
                    const shouldTruncate = shouldEnableTruncation && needsTruncation(rawContent) && !isExpanded;

                    // Render content based on type and truncation state
                    if (post.bodyMarkdown) {
                      const displayMarkdown = shouldTruncate ? truncateText(post.bodyMarkdown) : post.bodyMarkdown;
                      return <MarkdownWithEmojis markdown={displayMarkdown} />;
                    } else if (post.bodyHtml) {
                      const displayHtml = shouldTruncate ? truncateHtml(post.bodyHtml) : post.bodyHtml;
                      return <HtmlWithEmojis html={displayHtml} />;
                    } else if (post.bodyText) {
                      const displayText = shouldTruncate ? truncateText(post.bodyText) : post.bodyText;
                      return <p><TextWithEmojis text={displayText} /></p>;
                    } else {
                      return <div className="italic opacity-70">(No content)</div>;
                    }
                  })()}
                  {shouldEnableTruncation && needsTruncation(post.bodyMarkdown || post.bodyHtml || post.bodyText || "") && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-2 text-sm text-black hover:text-gray-700 font-medium transition-colors underline"
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                {/* ThreadRing badges */}
                {post.threadRings && post.threadRings.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-gray-600 font-medium">Posted to:</span>
                      {post.threadRings
                        .filter((association) => association && association.threadRing && association.threadRing.id)
                        .map((association) => (
                          <ThreadRingBadge
                            key={association.threadRing.id}
                            threadRing={association.threadRing}
                            size="small"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Ring Hub moderation actions */}
                {showRingHubModeration && (
                  <PostModerationActions
                    postId={post.ringHubPostId!}
                    currentStatus={post.moderationStatus}
                    isPinned={post.isPinned}
                    canModerate={moderationPermissions.canModerate}
                    onModerationAction={handleRingHubModerationAction}
                  />
                )}
            </>
          );
        })()}
      </div>

      {err && <div className="text-red-700 text-sm mt-2">{err}</div>}

      {/* --- Comments --- */}
      {/* Disable comments for fork notifications */}
      {(() => {
        const isForkNotification = (post.ringHubData?.metadata?.type === 'fork_notification') ||
                                  (post.ringHubData?.isNotification && post.ringHubData?.notificationType === 'fork_notification');
        return !isForkNotification;
      })() && (
        <section className="mt-4 border-t border-black pt-3">
        <button
            type="button"
            onClick={async () => {
                const wasOpen = commentsOpen;
                setCommentsOpen((o) => !o);
                if (!wasOpen) {
                  // Track comment expansion as engagement
                  await trackEngagement(post.id, 'comment_expand');
                  if (commentCount === null) setCommentsVersion((v) => v + 1);
                }
            }}
            className="flex w-full items-center justify-between rounded px-2 py-1 border border-black bg-white shadow-[2px_2px_0_#000] hover:bg-yellow-100 text-sm"
            aria-expanded={commentsOpen}
            aria-controls={`comments-${post.id}`}
            >
            <span className="font-semibold">Comments</span>
            <span className="opacity-70">{countLabel}</span>
        </button>

        {commentsOpen && (
            <div id={`comments-${post.id}`} className="mt-2 space-y-3">
            <NewCommentForm postId={post.id} onCommentAdded={handleCommentAdded} />
            <CommentList
                postId={post.id}
                version={commentsVersion}
                onLoaded={(n) => setCommentCount(n)}
                optimistic={optimistic}
                canModerate={isOwner}
                isAdmin={isAdmin}
                onCommentAdded={handleCommentAdded}
                onRemoved={() =>
                    setCommentCount((n) => (typeof n === "number" ? Math.max(0, n - 1) : n))
                }
                highlightCommentId={highlightCommentId}
            />
            </div>
        )}
        </section>
      )}

    </article>
  );
}
