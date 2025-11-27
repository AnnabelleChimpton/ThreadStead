import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { TextWithEmojis, HtmlWithEmojis, MarkdownWithEmojis, markdownToSafeHtmlWithEmojis, processHtmlWithEmojis } from "@/lib/comment-markup";
import { truncateText, truncateHtml, needsTruncation } from "@/lib/utils/text-truncation";
import hljs from "highlight.js"; // Ensure highlight.js is imported
import CommentList, { CommentWire as CommentWireList } from "./CommentList";
import NewCommentForm, { CommentWire as CommentWireForm } from "../../ui/forms/NewCommentForm";
import ThreadRingBadge from "../threadring/ThreadRingBadge";
import { UserWithRole } from "@/lib/utils/features/feature-flags";
import PostModerationActions from "./PostModerationActions";
import { useModerationPermissions } from "@/hooks/useModerationPermissions";
import { PostModerationAction, PostModerationStatus, ThreadRingRole } from "@/types/threadrings";
import ReportButton from "../../ui/feedback/ReportButton";
import PostActionsDropdown from "./PostActionsDropdown";
import { useWelcomeRingTracking } from "@/hooks/useWelcomeRingTracking";
import { useViewportTracking, trackEngagement } from "@/hooks/usePostView";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { PixelIcon } from "@/components/ui/PixelIcon";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import ImprovedBadgeDisplay from "../../shared/ImprovedBadgeDisplay";
import UserMention from "@/components/ui/navigation/UserMention";

// Helper function to format time ago (keeping for fallback or specific uses, but preferring formatDistanceToNow)
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
  tags?: string[];

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

  author?: {
    id: string;
    primaryHandle?: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string | null;
    }
  };
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
  metadata?: {
    mood?: string;
    listeningTo?: string;
    reading?: string;
    drinking?: string;
    location?: string;
  } | null;
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
      } catch { }
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
      const res = await csrfFetch("/api/posts/delete", {
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
      const res = await csrfFetch("/api/admin/delete-post", {
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
      const res = await csrfFetch(`/api/threadrings/${threadRingContext.slug}/posts/${post.id}/pin`, {
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
      const res = await csrfFetch(`/api/threadrings/${threadRingContext.slug}/posts/${post.id}/remove`, {
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

  const authorName = post.author?.profile?.displayName || post.author?.primaryHandle || "Anonymous";
  const authorUsername = post.author?.primaryHandle?.split('@')[0] || null;
  const authorLink = authorUsername ? `/resident/${authorUsername}` : null;
  const authorAvatarUrl = post.author?.profile?.avatarUrl;

  const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <article
      ref={viewportRef}
      id={`post-${post.id.slice(-6)}`}
      className={`post-item bg-thread-paper border-y sm:border border-thread-sage/30 p-5 sm:p-8 mb-6 sm:rounded-cozy shadow-cozySm hover:shadow-cozy transition-all duration-300 ${post.isPinned ? 'border-yellow-500 border-2' : ''}`}
      data-post-id={post.id.slice(-6)}
    >
      {/* Author Info & Header */}
      <header className="flex items-center gap-4 mb-5">
        {authorAvatarUrl ? (
          <Image
            src={authorAvatarUrl}
            alt={`${authorName}'s avatar`}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full border-2 border-thread-sage/20 shadow-sm"
            unoptimized={authorAvatarUrl?.endsWith('.gif')}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-thread-cream border-2 border-thread-sage/20 flex items-center justify-center shadow-sm">
            <span className="text-thread-sage font-mono text-lg">
              {authorName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {authorUsername ? (
              <UserMention
                username={authorUsername}
                displayName={authorName}
                className="font-bold text-lg text-thread-pine hover:text-thread-sunset transition-colors truncate"
              />
            ) : (
              <span className="font-bold text-lg text-thread-pine truncate">{authorName}</span>
            )}
            <span className="text-thread-sage text-sm">•</span>
            <span className="text-thread-sage text-sm font-medium">{postDate}</span>
            {post.isPinned && (
              <span className="text-xs bg-yellow-200 px-2 py-1 border border-black rounded ml-2">
                📌 Pinned
              </span>
            )}
          </div>
          {/* User badges */}
          <div className="mt-0.5">
            {post.author?.id && (
              <ImprovedBadgeDisplay
                userId={post.author.id}
                context="posts"
                layout="inline"
              />
            )}
          </div>
        </div>

        <div className="blog-post-actions flex items-center gap-2">
          {/* Check if this is a fork notification - if so, don't show actions dropdown */}
          {(() => {
            const isForkNotification = (post.ringHubData?.metadata?.type === 'fork_notification') ||
              (post.ringHubData?.isNotification && post.ringHubData?.notificationType === 'fork_notification');

            return !isForkNotification && (
              <PostActionsDropdown
                post={{
                  id: post.id,
                  title: post.title,
                  textPreview: post.bodyText?.substring(0, 100) || null,
                  author: {
                    id: post.author?.id || '',
                    primaryHandle: post.author?.primaryHandle,
                    profile: {
                      displayName: post.author?.profile?.displayName
                    }
                  }
                }}
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
      </header>

      <div className="blog-post-content sm:px-0">
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
              {/* Spoiler Warning */}
              {isSpoilerPost() && !spoilerRevealed && (
                <div className="mb-6 p-6 spoiler-warning rounded-xl border-2 border-dashed border-thread-sage/40 bg-thread-cream/30">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="font-bold text-xl text-thread-pine">Content Warning</h3>
                  </div>
                  {getSpoilerWarning() && (
                    <p className="mb-4 text-base text-thread-pine/80 font-medium">{getSpoilerWarning()}</p>
                  )}
                  <button
                    onClick={() => setSpoilerRevealed(true)}
                    className="px-6 py-2.5 bg-white text-black font-bold border-2 border-black hover:bg-yellow-200 shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all rounded-lg"
                  >
                    👁️ Reveal Content
                  </button>
                </div>
              )}

              {/* Post Title with Intent */}
              {post.title && (
                <div className={`mb-4 ${isSpoilerPost() && !spoilerRevealed ? 'spoiler-content hidden' : ''}`}>
                  {authorUsername ? (
                    <a
                      href={`/resident/${authorUsername}/post/${post.id}`}
                      className="block group"
                    >
                      {post.intent ? (
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-thread-cream/50 border border-thread-sage/20 text-sm text-thread-pine/80">
                            <span className="font-semibold">{authorName}</span>
                            <span>is {post.intent}</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-bold text-black leading-tight group-hover:text-thread-sunset transition-colors font-display tracking-tight">
                            {post.title}
                          </h2>
                        </div>
                      ) : (
                        <h2 className="text-2xl sm:text-3xl font-bold text-black leading-tight group-hover:text-thread-sunset transition-colors font-display tracking-tight">
                          {post.title}
                        </h2>
                      )}
                    </a>
                  ) : (
                    <div>
                      {post.intent ? (
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-thread-cream/50 border border-thread-sage/20 text-sm text-thread-pine/80">
                            <span className="font-semibold">{authorName}</span>
                            <span>is {post.intent}</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-bold text-black leading-tight font-display tracking-tight">
                            {post.title}
                          </h2>
                        </div>
                      ) : (
                        <h2 className="text-2xl sm:text-3xl font-bold text-black leading-tight font-display tracking-tight">
                          {post.title}
                        </h2>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Post Content */}
              <div className={`thread-content mb-6 text-lg leading-relaxed text-gray-800 ${isSpoilerPost() && !spoilerRevealed ? 'spoiler-content hidden' : ''}`}>
                {(() => {
                  // Determine content source and check if truncation is needed
                  const rawContent = post.bodyMarkdown || post.bodyHtml || post.bodyText || "";
                  const shouldTruncate = shouldEnableTruncation && needsTruncation(rawContent) && !isExpanded;

                  // Render content based on type and truncation state
                  let contentElement;
                  if (post.bodyMarkdown) {
                    const displayMarkdown = shouldTruncate ? truncateText(post.bodyMarkdown) : post.bodyMarkdown;
                    contentElement = <MarkdownWithEmojis markdown={displayMarkdown} />;
                  } else if (post.bodyHtml) {
                    const displayHtml = shouldTruncate ? truncateHtml(post.bodyHtml) : post.bodyHtml;
                    contentElement = <HtmlWithEmojis html={displayHtml} />;
                  } else if (post.bodyText) {
                    const displayText = shouldTruncate ? truncateText(post.bodyText) : post.bodyText;
                    contentElement = <p><TextWithEmojis text={displayText} /></p>;
                  } else {
                    contentElement = <div className="italic opacity-70">(No content)</div>;
                  }

                  return (
                    <div className="relative">
                      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${shouldTruncate ? 'max-h-[400px] mask-linear-fade' : ''}`}>
                        {contentElement}
                      </div>
                      {shouldEnableTruncation && needsTruncation(rawContent) && (
                        <div className={`mt-4 flex justify-center ${!isExpanded ? 'absolute bottom-0 left-0 right-0 pt-20 pb-0 bg-gradient-to-t from-thread-paper to-transparent' : ''}`}>
                          <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="group flex items-center gap-2 px-6 py-2 bg-white border border-thread-sage/30 rounded-full shadow-sm hover:shadow-md hover:border-thread-sunset/50 transition-all"
                          >
                            <span className="text-sm font-semibold text-thread-pine group-hover:text-thread-sunset">
                              {isExpanded ? 'Show less' : 'Continue reading'}
                            </span>
                            <span className="text-xs transform group-hover:translate-y-0.5 transition-transform">
                              {isExpanded ? '↑' : '↓'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Journal Metadata */}
              {post.metadata && (post.metadata.mood || post.metadata.listeningTo || post.metadata.reading || post.metadata.drinking || post.metadata.location) && (
                <div className="mb-6 p-4 bg-thread-cream/30 border border-thread-sage/20 rounded-lg text-sm font-mono text-thread-pine/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {post.metadata?.mood && (
                      <div className="flex items-center gap-2">
                        <PixelIcon name="heart" size={16} className="text-thread-sage" />
                        <span>Mood: <strong>{post.metadata.mood}</strong></span>
                      </div>
                    )}
                    {post.metadata?.listeningTo && (
                      <div className="flex items-center gap-2">
                        <PixelIcon name="music" size={16} className="text-thread-sage" />
                        <span>Listening to: <strong>{post.metadata.listeningTo}</strong></span>
                      </div>
                    )}
                    {post.metadata?.reading && (
                      <div className="flex items-center gap-2">
                        <PixelIcon name="script" size={16} className="text-thread-sage" />
                        <span>Reading: <strong>{post.metadata.reading}</strong></span>
                      </div>
                    )}
                    {post.metadata?.drinking && (
                      <div className="flex items-center gap-2">
                        <PixelIcon name="drop" size={16} className="text-thread-sage" />
                        <span>Drinking: <strong>{post.metadata.drinking}</strong></span>
                      </div>
                    )}
                    {post.metadata?.location && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <PixelIcon name="map" size={16} className="text-thread-sage" />
                        <span>Location: <strong>{post.metadata.location}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-thread-cream/60 border border-thread-sage/10 rounded-lg text-sm text-thread-pine hover:bg-thread-cream hover:border-thread-sage/30 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* ThreadRing badges */}
              {post.threadRings && post.threadRings.length > 0 && (
                <div className="mb-5 pt-4 border-t border-thread-sage/10">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs uppercase tracking-wider text-thread-sage font-semibold">Posted to</span>
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

      {err && <div className="text-red-700 text-sm mt-2 sm:px-0">{err}</div>}

      {/* --- Footer & Comments --- */}
      {/* Disable comments for fork notifications */}
      {(() => {
        const isForkNotification = (post.ringHubData?.metadata?.type === 'fork_notification') ||
          (post.ringHubData?.isNotification && post.ringHubData?.notificationType === 'fork_notification');
        return !isForkNotification;
      })() && (
          <>
            <footer className="flex items-center justify-between pt-4 border-t-2 border-thread-sage/10">
              <div className="flex items-center gap-4">
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
                  className="group inline-flex flex-row items-center gap-2 px-3 py-1.5 -ml-3 rounded-lg hover:bg-thread-cream/50 transition-colors whitespace-nowrap"
                  style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', whiteSpace: 'nowrap' }}
                  aria-expanded={commentsOpen}
                  aria-controls={`comments-${post.id}`}
                >
                  <PixelIcon name="chat" size={20} className="text-thread-sage group-hover:scale-110 transition-transform shrink-0" style={{ flexShrink: 0, display: 'block' }} />
                  <span className="font-medium text-thread-pine group-hover:text-thread-sunset leading-none">
                    {countLabel}
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                {authorLink && (
                  <Link
                    href={`${authorLink}?tab=blog`}
                    className="text-sm font-medium text-thread-sage hover:text-thread-pine transition-colors flex items-center gap-1 group"
                  >
                    <span>View on profile</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                )}
              </div>
            </footer>

            {commentsOpen && (
              <section id={`comments-${post.id}`} className="mt-6 pt-6 border-t border-thread-sage/20 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-6">
                  <NewCommentForm postId={post.id} onCommentAdded={handleCommentAdded} />
                  <CommentList
                    postId={post.id}
                    version={commentsVersion}
                    onLoaded={(n) => setCommentCount(n)}
                    optimistic={optimistic}
                    canModerate={isOwner}
                    isAdmin={isAdmin}
                    onCommentAdded={handleCommentAdded}
                    highlightCommentId={highlightCommentId}
                  />
                </div>
              </section>
            )}
          </>
        )}
    </article>
  );
}
