import React, { useState, useEffect } from 'react';
import CompactBadgeDisplay from './CompactBadgeDisplay';
import { renderCommentMarkup } from '../lib/comment-markup';

interface PhotoComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    primaryHandle: string;
    profile: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  replies: PhotoComment[];
}

interface PhotoCommentsProps {
  photoId: string;
  highlightCommentId?: string; // For highlighting specific comments from notifications
}

export default function PhotoComments({ photoId, highlightCommentId }: PhotoCommentsProps) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/photos/comments/${photoId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        setError("Failed to load comments");
      }
    } catch (err) {
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [photoId]);

  // Scroll to highlighted comment after comments load
  useEffect(() => {
    if (highlightCommentId && comments.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('animate-pulse');
          setTimeout(() => element.classList.remove('animate-pulse'), 2000);
        }
      }, 100);
    }
  }, [highlightCommentId, comments]);

  const handleSubmitComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Get capability token
      const capRes = await fetch("/api/cap/photo-comment", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId })
      });
      
      if (capRes.status === 401) {
        setError("Please log in to comment");
        return;
      }
      
      const { token } = await capRes.json();

      // Submit comment
      const response = await fetch(`/api/photos/comments/${photoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parentId,
          cap: token
        })
      });

      if (response.ok) {
        // Reset forms
        if (parentId) {
          setReplyContent('');
          setReplyTo(null);
        } else {
          setNewComment('');
        }
        
        // Reload comments
        await loadComments();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit comment');
      }
    } catch (err) {
      setError('Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDisplayName = (author: PhotoComment['author']) => {
    return author.profile?.displayName || author.primaryHandle?.split('@')[0] || 'Anonymous';
  };

  const renderComment = (comment: PhotoComment, isReply = false) => {
    const isHighlighted = comment.id === highlightCommentId;
    
    return (
      <div 
        key={comment.id} 
        id={`comment-${comment.id}`}
        className={`space-y-2 ${isReply ? 'ml-8 pl-4 border-l-2 border-thread-sage/30' : ''} ${
          isHighlighted ? 'bg-yellow-100 border border-yellow-300 rounded-lg p-3 -m-1' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.author.profile?.avatarUrl ? (
              <img
                src={comment.author.profile.avatarUrl}
                alt={`${getDisplayName(comment.author)}'s avatar`}
                className="w-8 h-8 rounded-full border border-thread-sage/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-thread-cream border border-thread-sage/30 flex items-center justify-center">
                <span className="text-thread-sage font-mono text-xs">
                  {getDisplayName(comment.author).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Author and timestamp */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-thread-pine text-sm">
                {getDisplayName(comment.author)}
              </span>
              <span className="text-thread-sage text-xs">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            
            {/* User badges */}
            <div className="mb-1">
              <CompactBadgeDisplay 
                userId={comment.author.id} 
                context="comments" 
                size="small"
              />
            </div>

            {/* Comment content */}
            <div className="text-thread-charcoal text-sm leading-relaxed">
              {renderCommentMarkup(comment.content)}
            </div>

            {/* Reply button */}
            {!isReply && (
              <button
                onClick={() => setReplyTo(comment.id)}
                className="text-thread-pine text-xs hover:text-thread-sunset mt-1"
              >
                Reply
              </button>
            )}

            {/* Reply form */}
            {replyTo === comment.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${getDisplayName(comment.author)}...`}
                  className="w-full p-2 text-sm border border-thread-sage rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine resize-none"
                  rows={2}
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmitComment(comment.id)}
                    disabled={submitting || !replyContent.trim()}
                    className="text-xs px-3 py-1 bg-thread-pine text-white rounded hover:bg-thread-pine/90 disabled:opacity-50"
                  >
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setReplyContent('');
                    }}
                    className="text-xs px-3 py-1 text-thread-sage hover:text-thread-charcoal"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-thread-pine border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-thread-sage text-sm">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment form */}
      <div className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts about this photo..."
          className="w-full p-3 border border-thread-sage rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine resize-none"
          rows={3}
          maxLength={1000}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-thread-sage">
            {newComment.length}/1000 characters
          </span>
          <button
            onClick={() => handleSubmitComment()}
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-thread-pine text-white rounded hover:bg-thread-pine/90 disabled:opacity-50 text-sm"
          >
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
          {error}
        </div>
      )}

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium text-thread-pine">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </h4>
          <div className="space-y-4">
            {comments.map(comment => renderComment(comment))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-thread-sage">
          <div className="text-2xl mb-2">💬</div>
          <p className="text-sm">Be the first to comment on this photo!</p>
        </div>
      )}
    </div>
  );
}