import React, { useState } from "react";

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { id?: string | null; handle?: string | null; avatarUrl?: string | null } | null;
  parentId?: string | null;
};

type Props = {
  postId: string;
  parentId?: string;
  onCommentAdded?: (c: CommentWire) => void;
  placeholder?: string;
};

export default function NewCommentForm({ postId, parentId, onCommentAdded, placeholder = "Write a comment…" }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = loading || !content.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);

    try {
      const capRes = await fetch(`/api/cap/comments/${encodeURIComponent(postId)}`, { method: "POST" });
      if (capRes.status === 401) { setError("Please log in to comment."); return; }
      if (!capRes.ok) { setError(`Couldn't get permission (status ${capRes.status}).`); return; }
      const { token } = await capRes.json();

      const res = await fetch(`/api/comments/${encodeURIComponent(postId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, cap: token, parentId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || `Failed (status ${res.status}).`); return; }

      setContent("");
      if (data?.comment) onCommentAdded?.(data.comment as CommentWire);
      else onCommentAdded?.({ 
        id: crypto.randomUUID(), 
        content: text, 
        parentId,
        createdAt: new Date().toISOString()
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="comment-form flex flex-col gap-2">
      <textarea
        className="comment-form textarea border border-black md:border-black p-2 md:p-2 bg-white rounded"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
      />
      <div className="comment-form-actions flex gap-2 items-center">
        <button
          type="submit"
          disabled={disabled}
          className="comment-submit-button border border-black md:border-black px-3 py-1 md:px-3 md:py-1 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] disabled:opacity-60"
          aria-busy={loading}
        >
          {loading ? "Posting…" : "Post Comment"}
        </button>
        {error && <span className="comment-error text-red-700 text-sm">{error}</span>}
      </div>
    </form>
  );
}
