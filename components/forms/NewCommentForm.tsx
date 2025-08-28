import React, { useState, useRef } from "react";

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
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const disabled = loading || !content.trim();

  // Helper function to insert text at cursor position
  const insertAtCursor = (beforeText: string, afterText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      beforeText + 
      selectedText + 
      afterText + 
      content.substring(end);
    
    setContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      const newCursorPos = start + beforeText.length + selectedText.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const formatActions = [
    {
      label: 'Bold',
      icon: 'B',
      action: () => insertAtCursor('**', '**'),
      title: 'Bold text (**text**)'
    },
    {
      label: 'Italic', 
      icon: 'I',
      action: () => insertAtCursor('*', '*'),
      title: 'Italic text (*text*)'
    },
    {
      label: 'Link',
      icon: '🔗',
      action: () => insertAtCursor('[', '](https://example.com)'),
      title: 'Add link ([text](url))'
    },
    {
      label: 'Quote',
      icon: '"',
      action: () => insertAtCursor('> ', ''),
      title: 'Add quote (> text)'
    },
    {
      label: 'List',
      icon: '•',
      action: () => insertAtCursor('- ', ''),
      title: 'Add bullet point (- text)'
    }
  ];

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
      {/* Formatting toolbar */}
      <div className="formatting-toolbar flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-300 rounded-t">
        {formatActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.action}
            title={action.title}
            className="formatting-button px-2 py-1 text-xs border border-gray-400 bg-white hover:bg-gray-100 rounded font-mono"
          >
            {action.icon}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          title="Formatting help"
          className="formatting-help-button px-2 py-1 text-xs border border-gray-400 bg-blue-50 hover:bg-blue-100 rounded ml-auto"
        >
          ?
        </button>
      </div>

      {/* Help text */}
      {showHelp && (
        <div className="formatting-help text-xs bg-blue-50 border border-blue-200 rounded p-3">
          <div className="font-medium mb-2">Formatting options:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-gray-700">
            <div><code>**bold text**</code> → <strong>bold text</strong></div>
            <div><code>*italic text*</code> → <em>italic text</em></div>
            <div><code>[link text](url)</code> → <a href="#" className="text-blue-600 underline">link text</a></div>
            <div><code>&gt; quote text</code> → blockquote</div>
            <div><code>- list item</code> → • list item</div>
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="comment-form-textarea border border-black md:border-black p-2 md:p-2 bg-white rounded-b"
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
