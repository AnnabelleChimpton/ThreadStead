import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";
import CommentList, { CommentWire } from "./CommentList";
import NewCommentForm from "../forms/NewCommentForm";
import PostActionsDropdown from "./PostActionsDropdown";
import ThreadRingBadge from "../ThreadRingBadge";
import CompactBadgeDisplay from "../CompactBadgeDisplay";
import { useMe } from "@/hooks/useMe";

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
};

type FeedPostProps = {
  post: FeedPostData;
  showActivity?: boolean;
};

export default function FeedPost({ post, showActivity = false }: FeedPostProps) {
  const { me } = useMe();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [actualCommentCount, setActualCommentCount] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<CommentWire[]>([]);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  // Determine the content to display
  const content = React.useMemo(() => {
    if (post.bodyHtml) {
      return cleanAndNormalizeHtml(post.bodyHtml);
    }
    if (post.bodyMarkdown) {
      return markdownToSafeHtml(post.bodyMarkdown);
    }
    if (post.bodyText) {
      return post.bodyText.replace(/\n/g, "<br>");
    }
    return "";
  }, [post.bodyHtml, post.bodyMarkdown, post.bodyText]);

  const authorName = post.authorDisplayName || post.authorUsername || "Anonymous";
  const authorLink = post.authorUsername ? `/resident/${post.authorUsername}` : null;
  
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

  // Post actions (for now, just basic delete - FeedPost doesn't support editing)
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
      const res = await fetch("/api/posts/delete", {
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
      const res = await fetch("/api/admin/delete-post", {
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
    <article className="bg-thread-paper border border-thread-sage/30 p-6 mb-4 rounded-cozy shadow-cozySm hover:shadow-cozy transition-shadow">
      {/* Author Info */}
      <header className="flex items-center gap-3 mb-4">
        {post.authorAvatarUrl ? (
          <Image
            src={post.authorAvatarUrl}
            alt={`${authorName}'s avatar`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full border-2 border-thread-sage/30 shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-thread-cream border-2 border-thread-sage/30 flex items-center justify-center">
            <span className="text-thread-sage font-mono text-sm">
              {authorName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {authorLink ? (
              <Link href={authorLink} className="font-medium text-thread-pine hover:text-thread-sunset transition-colors">
                {authorName}
              </Link>
            ) : (
              <span className="font-medium text-thread-pine">{authorName}</span>
            )}
            <span className="thread-label">{postDate}</span>
          </div>
          {/* User badges */}
          <div className="mt-1">
            <CompactBadgeDisplay 
              userId={post.authorId} 
              context="posts" 
              size="small"
            />
          </div>
          {showActivity && post.lastCommentAt && (
            <div className="thread-label text-xs mt-1">
              Latest activity: {lastActivityDate}
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
          onDelete={deletePost}
          onAdminDelete={adminDeletePost}
          // Note: FeedPost doesn't support editing, so no onEdit
        />
      </header>

      {/* Spoiler Warning */}
      {post.isSpoiler && !spoilerRevealed && (
        <div className="mb-4 p-4 spoiler-warning rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-lg">Content Warning</h3>
          </div>
          {post.contentWarning && (
            <p className="mb-3 text-sm">{post.contentWarning}</p>
          )}
          <button
            onClick={() => setSpoilerRevealed(true)}
            className="px-4 py-2 bg-white text-black font-bold border-2 border-black hover:bg-yellow-200 shadow-[2px_2px_0_#000] transition-all"
          >
            👁️ Click to Reveal Spoilers
          </button>
        </div>
      )}

      {/* Post Title with Intent */}
      {post.title && (
        <div className={`mb-4 ${post.isSpoiler && !spoilerRevealed ? 'spoiler-content' : ''}`}>
          {post.authorUsername ? (
            <Link 
              href={`/resident/${post.authorUsername}/post/${post.id}`}
              className="block hover:bg-gray-50 -m-2 p-2 rounded transition-colors"
            >
              {post.intent ? (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{authorName}</span>
                    <span> is {post.intent}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-black leading-tight">{post.title}</h2>
                </div>
              ) : (
                <h2 className="text-xl font-semibold text-black">{post.title}</h2>
              )}
            </Link>
          ) : (
            <div>
              {post.intent ? (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{authorName}</span>
                    <span> is {post.intent}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-black leading-tight">{post.title}</h2>
                </div>
              ) : (
                <h2 className="text-xl font-semibold text-black">{post.title}</h2>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post Content */}
      <div className={`thread-content mb-4 ${post.isSpoiler && !spoilerRevealed ? 'spoiler-content' : ''}`}>
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p className="text-thread-sage italic">No content available</p>
        )}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, idx) => (
            <span
              key={idx}
              className="thread-label bg-thread-cream px-2 py-1 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ThreadRing badges */}
      {post.threadRings && post.threadRings.length > 0 && (
        <div className="mb-4 pt-2 border-t border-thread-sage/20">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-thread-sage font-medium">Posted to:</span>
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

      {/* Footer */}
      <footer className="flex items-center justify-between text-sm border-t border-thread-sage/20 pt-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setCommentsOpen(!commentsOpen);
              if (!commentsOpen && actualCommentCount === null) {
                setCommentsVersion(v => v + 1);
              }
            }}
            className="thread-label hover:text-thread-sunset transition-colors cursor-pointer"
          >
            {displayCommentCount} {displayCommentCount === 1 ? 'comment' : 'comments'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {authorLink && (
            <Link
              href={`${authorLink}?tab=blog`}
              className="thread-label hover:text-thread-sunset"
            >
              View on profile →
            </Link>
          )}
        </div>
      </footer>

      {/* Comments Section */}
      {commentsOpen && (
        <section className="mt-4 border-t border-thread-sage/20 pt-4">
          <div className="space-y-4">
            <NewCommentForm postId={post.id} onCommentAdded={handleCommentAdded} />
            <CommentList
              postId={post.id}
              version={commentsVersion}
              onLoaded={handleCommentsLoaded}
              optimistic={optimistic}
              canModerate={false}
              isAdmin={false}
              onCommentAdded={handleCommentAdded}
              onRemoved={() => {
                setActualCommentCount(n => typeof n === "number" ? Math.max(0, n - 1) : n);
              }}
            />
          </div>
        </section>
      )}
    </article>
  );
}