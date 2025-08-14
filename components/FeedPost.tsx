import React, { useState } from "react";
import Link from "next/link";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";
import CommentList, { CommentWire } from "./CommentList";
import NewCommentForm from "./NewCommentForm";

export type FeedPostData = {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
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
};

type FeedPostProps = {
  post: FeedPostData;
  showActivity?: boolean;
};

export default function FeedPost({ post, showActivity = false }: FeedPostProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [actualCommentCount, setActualCommentCount] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<CommentWire[]>([]);

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
  const authorLink = post.authorUsername ? `/${post.authorUsername}` : null;
  
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
  
  const handleCommentAdded = (c: CommentWire) => {
    setOptimistic((arr) => [c, ...arr]);
    setCommentsOpen(true);
  };

  const handleCommentsLoaded = (count: number) => {
    setActualCommentCount(count);
  };

  return (
    <article className="bg-thread-paper border border-thread-sage/30 p-6 mb-4 rounded-cozy shadow-cozySm hover:shadow-cozy transition-shadow">
      {/* Author Info */}
      <header className="flex items-center gap-3 mb-4">
        {post.authorAvatarUrl ? (
          <img
            src={post.authorAvatarUrl}
            alt={`${authorName}'s avatar`}
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
          {showActivity && post.lastCommentAt && (
            <div className="thread-label text-xs mt-1">
              Latest activity: {lastActivityDate}
              {post.lastCommenterUsername && ` by ${post.lastCommenterUsername}`}
            </div>
          )}
        </div>
      </header>

      {/* Post Content */}
      <div className="thread-content mb-4">
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