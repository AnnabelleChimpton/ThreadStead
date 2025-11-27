
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { useRouter } from "next/router";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import { markdownToSafeHtmlWithEmojis, processHtmlWithEmojis, loadEmojiMap } from "@/lib/comment-markup";
import { truncateText, truncateHtml, needsTruncation } from "@/lib/utils/text-truncation";
import CommentList, { CommentWire } from "./CommentList";
import NewCommentForm from "../../ui/forms/NewCommentForm";
import PostActionsDropdown from "./PostActionsDropdown";
import ThreadRingBadge from "../threadring/ThreadRingBadge";
import ImprovedBadgeDisplay from "../../shared/ImprovedBadgeDisplay";
import { useMe } from "@/hooks/useMe";
import UserMention from "@/components/ui/navigation/UserMention";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

export type FeedPostData = {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  title: string | null;
  intent: PostIntent | null;
  createdAt: string;
  updatedAt: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  bodyMarkdown: string | null;
  media: unknown;
  tags: string[];
  commentCount: number;
  lastCommentAt?: string | null;
  lastCommenterUsername?: string | null;
  threadRings?: Array<{
    threadRing: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  isSpoiler?: boolean;
  contentWarning?: string | null;
  metadata?: {
    mood?: string;
    listeningTo?: string;
    reading?: string;
    drinking?: string;
    location?: string;
  } | null;
};

type FeedPostProps = {
  post: FeedPostData;
  showActivity?: boolean;
};

export default function FeedPost({ post, showActivity = false }: FeedPostProps) {
  const { me } = useMe();
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [actualCommentCount, setActualCommentCount] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<CommentWire[]>([]);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine the content to display
  const [content, setContent] = React.useState("");
  const [shouldTruncate, setShouldTruncate] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function processContent() {
      try {
        let html: string;
        if (post.bodyMarkdown) {
          html = await markdownToSafeHtmlWithEmojis(post.bodyMarkdown);
        } else if (post.bodyHtml) {
          html = cleanAndNormalizeHtml(post.bodyHtml);
          await loadEmojiMap();
          html = processHtmlWithEmojis(html);
        } else if (post.bodyText) {
          html = post.bodyText.replace(/\n/g, "<br>");
          await loadEmojiMap();
          html = processHtmlWithEmojis(html);
        } else {
          html = "";
        }

        if (!cancelled) {
          // Check if content needs truncation
          const needsTrunc = needsTruncation(html);
          setShouldTruncate(needsTrunc);
          setContent(html);
        }
      } catch (error) {
        console.error('Failed to process feed post content:', error);
        if (!cancelled) {
          // Fallback to original processing
          let fallbackHtml: string;
          if (post.bodyMarkdown) {
            fallbackHtml = markdownToSafeHtml(post.bodyMarkdown);
          } else if (post.bodyHtml) {
            fallbackHtml = cleanAndNormalizeHtml(post.bodyHtml);
          } else if (post.bodyText) {
            fallbackHtml = post.bodyText.replace(/\n/g, "<br>");
          } else {
            fallbackHtml = "";
          }
          const needsTrunc = needsTruncation(fallbackHtml);
          setShouldTruncate(needsTrunc);
          setContent(fallbackHtml);
        }
      }
    }

    processContent();

    return () => {
      cancelled = true;
    };
  }, [post.bodyHtml, post.bodyMarkdown, post.bodyText]);

  const authorName = post.authorDisplayName || post.authorUsername || "Anonymous";
  const authorLink = post.authorUsername ? `/ resident / ${post.authorUsername} ` : null;

  const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const lastActivityDate = post.lastCommentAt
    ? new Date(post.lastCommentAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    : null;

  const displayCommentCount = actualCommentCount !== null ? actualCommentCount + optimistic.length : post.commentCount;

  // Check if current user owns this post
  const isOwner = me?.loggedIn && me.user?.id === post.authorId;
  const isAdmin = me?.loggedIn && me.user?.role === "admin";

  const handleCommentAdded = (c: CommentWire) => {
    setOptimistic((arr) => [c, ...arr]);
    setCommentsOpen(true);
  };

  const handleCommentsLoaded = (count: number) => {
    setActualCommentCount(count);
  };

  // Post actions
  function handleEdit() {
    // Navigate to edit page
    if (post.authorUsername) {
      router.push(`/ resident / ${post.authorUsername} /post/${post.id}/edit`);
    }
  }

  async function mintPostCap(): Promise<string> {
    const capRes = await fetch("/api/cap/post", { method: "POST" });
    if (capRes.status === 401) throw new Error("Please log in.");
    if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
    const { token } = await capRes.json();
    return token;
  }

  async function deletePost() {
    if (!confirm("Delete this post? This action cannot be undone.")) return;

    try {
      const token = await mintPostCap();
      const res = await csrfFetch("/api/posts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, cap: token }),
      });

      if (res.ok) {
        // Refresh the page to remove the deleted post from feed
        window.location.reload();
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post");
    }
  }

  async function adminDeletePost() {
    if (!confirm("Admin delete this post? This action cannot be undone.")) return;

    try {
      const res = await csrfFetch("/api/admin/delete-post", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (res.ok) {
        // Refresh the page to remove the deleted post from feed
        window.location.reload();
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post");
    }
  }

  return (
    <article className="bg-thread-paper border-y sm:border border-thread-sage/30 p-5 sm:p-8 mb-6 sm:rounded-cozy shadow-cozySm hover:shadow-cozy transition-all duration-300">
      {/* Author Info */}
      <header className="flex items-center gap-4 mb-5">
        {post.authorAvatarUrl ? (
          <Image
            src={post.authorAvatarUrl}
            alt={`${authorName}'s avatar`}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full border-2 border-thread-sage/20 shadow-sm"
            unoptimized={post.authorAvatarUrl?.endsWith('.gif')}
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
            {post.authorUsername ? (
              <UserMention
                username={post.authorUsername}
                displayName={authorName}
                className="font-bold text-lg text-thread-pine hover:text-thread-sunset transition-colors truncate"
              />
            ) : (
              <span className="font-bold text-lg text-thread-pine truncate">{authorName}</span>
            )}
            <span className="text-thread-sage text-sm">•</span>
            <span className="text-thread-sage text-sm font-medium">{postDate}</span>
          </div>
          {/* User badges */}
          <div className="mt-0.5">
            <ImprovedBadgeDisplay
              userId={post.authorId}
              context="posts"
              layout="inline"
            />
          </div>
          {showActivity && post.lastCommentAt && (
            <div className="text-xs text-thread-sage mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Active {lastActivityDate}
              {post.lastCommenterUsername && ` by ${post.lastCommenterUsername}`}
            </div>
          )}
        </div>

        {/* Actions Dropdown */}
        <PostActionsDropdown
          post={{
            id: post.id,
            title: post.title,
            textPreview: post.bodyText?.substring(0, 100) || null,
            author: {
              id: post.authorId,
              primaryHandle: post.authorUsername || undefined,
              profile: {
                displayName: post.authorDisplayName || undefined
              }
            }
          }}
          isOwner={isOwner}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={deletePost}
          onAdminDelete={adminDeletePost}
        />
      </header>

      {/* Spoiler Warning */}
      {post.isSpoiler && !spoilerRevealed && (
        <div className="mb-6 p-6 spoiler-warning rounded-xl border-2 border-dashed border-thread-sage/40 bg-thread-cream/30">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-bold text-xl text-thread-pine">Content Warning</h3>
          </div>
          {post.contentWarning && (
            <p className="mb-4 text-base text-thread-pine/80 font-medium">{post.contentWarning}</p>
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
        <div className={`mb-4 ${post.isSpoiler && !spoilerRevealed ? 'spoiler-content hidden' : ''}`}>
          {post.authorUsername ? (
            <Link
              href={`/resident/${post.authorUsername}/post/${post.id}`}
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
            </Link>
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
      <div className={`thread-content mb-6 text-lg leading-relaxed text-gray-800 ${post.isSpoiler && !spoilerRevealed ? 'spoiler-content hidden' : ''}`}>
        {content ? (
          <div className="relative">
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${shouldTruncate && !isExpanded ? 'max-h-[400px] mask-linear-fade' : ''}`}
              dangerouslySetInnerHTML={{
                __html: content // We render full content but mask it with CSS if truncated
              }}
            />
            {shouldTruncate && (
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
        ) : null}
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
      {
        post.tags && post.tags.length > 0 && (
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
        )
      }

      {/* ThreadRing badges */}
      {
        post.threadRings && post.threadRings.length > 0 && (
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
        )
      }

      {/* Footer */}
      <footer className="flex items-center justify-between pt-4 border-t-2 border-thread-sage/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setCommentsOpen(!commentsOpen);
              if (!commentsOpen && actualCommentCount === null) {
                setCommentsVersion(v => v + 1);
              }
            }}
            className="group inline-flex flex-row items-center gap-2 px-3 py-1.5 -ml-3 rounded-lg hover:bg-thread-cream/50 transition-colors whitespace-nowrap"
            style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', whiteSpace: 'nowrap' }}
          >
            <PixelIcon name="chat" size={20} className="text-thread-sage group-hover:scale-110 transition-transform shrink-0" style={{ flexShrink: 0, display: 'block' }} />
            <span className="font-medium text-thread-pine group-hover:text-thread-sunset leading-none">
              {displayCommentCount}
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

      {/* Comments Section */}
      {
        commentsOpen && (
          <section className="mt-6 pt-6 border-t border-thread-sage/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-6">
              <NewCommentForm postId={post.id} onCommentAdded={handleCommentAdded} />
              <CommentList
                postId={post.id}
                version={commentsVersion}
                onLoaded={handleCommentsLoaded}
                optimistic={optimistic}
                canModerate={false}
                isAdmin={false}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          </section>
        )
      }
    </article >
  );
}