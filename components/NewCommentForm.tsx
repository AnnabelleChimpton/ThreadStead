import React, { useState } from "react";

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { handle?: string | null; avatarUrl?: string | null } | null;
};

type Props = {
  postId: string;
  onCommentAdded?: (c: CommentWire) => void; // now passes the new comment up
};

export default function NewCommentForm({ postId, onCommentAdded }: Props) {
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
      // 1) Mint capability
      const capRes = await fetch(`/api/cap/comments/${encodeURIComponent(postId)}`, {
        method: "POST",
      });

      if (capRes.status === 401) {
        setError("Please log in to comment.");
        return;
      }
      if (!capRes.ok) {
        setError(`Couldn’t get permission to post a comment (status ${capRes.status}).`);
        return;
      }

      const { token } = await capRes.json();

      // 2) Post comment with capability
      const res = await fetch(`/api/comments/${encodeURIComponent(postId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, cap: token }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Failed to post comment (status ${res.status}).`);
        return;
      }

      // Success — optimistically push to UI
      setContent("");
      if (data?.comment) onCommentAdded?.(data.comment as CommentWire);
      else onCommentAdded?.({ id: crypto.randomUUID(), content: text }); // fallback, just in case
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        className="border border-black p-2 bg-white rounded"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment…"
        disabled={loading}
      />
      <div className="flex gap-2 items-center">
        <button
          type="submit"
          disabled={disabled}
          className="border border-black px-3 py-1 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] disabled:opacity-60"
          aria-busy={loading}
        >
          {loading ? "Posting…" : "Post Comment"}
        </button>
        {error && <span className="text-red-700 text-sm">{error}</span>}
      </div>
    </form>
  );
}
