import React, { useMemo, useState, useEffect } from "react";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";
import hljs from "highlight.js"; // Ensure highlight.js is imported
import CommentList, { CommentWire as CommentWireList } from "./CommentList";
import NewCommentForm, { CommentWire as CommentWireForm } from "../forms/NewCommentForm";
import Link from "next/link";
import ThreadRingBadge from "../ThreadRingBadge";
import PostHeader from "../PostHeader";
import { featureFlags } from "@/lib/feature-flags";

type Visibility = "public" | "followers" | "friends" | "private";
type Mode = "text" | "markdown" | "html";
type View = "write" | "preview";

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
};

const VIS_OPTS: { v: Visibility; label: string }[] = [
  { v: "public", label: "Public" },
  { v: "followers", label: "Followers" },
  { v: "friends", label: "Friends" },
  { v: "private", label: "Only Me" },
];

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string) {
  return `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
}

export default function PostItem({
  post,
  isOwner,
  isAdmin = false,
  onChanged,
  highlightCommentId,
  initialCommentsOpen = false,
  threadRingContext = null,
  canModerateRing = false,
}: {
  post: Post;
  isOwner: boolean;
  isAdmin?: boolean;
  onChanged?: () => void | Promise<void>;
  highlightCommentId?: string | null;
  initialCommentsOpen?: boolean;
  threadRingContext?: { slug: string; name: string } | null;
  canModerateRing?: boolean;
}) {
  const initialMode: Mode = post.bodyHtml ? "html" : "text";

  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>("write");
  const [title, setTitle] = useState<string>(post.title ?? "");
  const [text, setText] = useState<string>(post.bodyHtml ?? post.bodyText ?? "");
  const [vis, setVis] = useState<Visibility>(post.visibility);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<CommentWireList[]>([]);


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

  // optional: kick a background sync next time (or immediately if you prefer)
  // setCommentsVersion((v) => v + 1);
};

const hasServerCount = commentCount !== null;
const countLabel = hasServerCount
  ? String((commentCount ?? 0) + optimistic.length)
  : (optimistic.length ? `${optimistic.length}+` : "…");

  // Convert text to HTML when necessary
  const previewHtml = useMemo(() => {
    if (!text.trim()) return "<p class='opacity-60'>(Nothing to preview)</p>";
    if (mode === "markdown") return markdownToSafeHtml(text);
    if (mode === "html") return cleanAndNormalizeHtml(text);
    return textToHtml(text);
  }, [text, mode]);

  // Function to apply syntax highlighting
  const highlightCodeBlocks = () => {
    if (mode === "text") return; // Do not apply highlighting if in text mode

    const blocks = document.querySelectorAll("pre code");
    blocks.forEach((block) => {
      // Remove the highlighted state before applying highlighting again
      block.removeAttribute("data-highlighted");

      // Apply syntax highlighting
      hljs.highlightElement(block as HTMLElement);
    });
  };

  // UseEffect to apply highlighting whenever the content changes
  useEffect(() => {
    highlightCodeBlocks();
  }, [previewHtml, text, mode]);

  async function mintPostCap(): Promise<string> {
    const capRes = await fetch("/api/cap/post", { method: "POST" });
    if (capRes.status === 401) throw new Error("Please log in.");
    if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
    const { token } = await capRes.json();
    return token;
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const token = await mintPostCap();
      const payload: Record<string, any> = { id: post.id, visibility: vis, cap: token };
      if (title.trim()) payload.title = title.trim();
      if (mode === "markdown") payload.bodyMarkdown = text;
      else if (mode === "html") payload.bodyHtml = text;
      else payload.bodyText = text;

      const res = await fetch("/api/posts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);

      setEditing(false);
      setView("write");
      await onChanged?.();
      
      // Force highlight code blocks after saving, just like switching to preview
      highlightCodeBlocks();
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setBusy(false);
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

      // Reapply highlighting after deleting and re-rendering
      highlightCodeBlocks();
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

  function cancelEdit() {
    setEditing(false);
    setMode(initialMode);
    setTitle(post.title ?? "");
    setText(post.bodyHtml ?? post.bodyText ?? "");
    setVis(post.visibility);
    setView("write");
    setErr(null);
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

  return (
    <article id={`post-${post.id.slice(-6)}`} className={`blog-post-card border border-black p-3 bg-white shadow-[2px_2px_0_#000] ${post.isPinned ? 'border-yellow-500 border-2' : ''}`} data-post-id={post.id.slice(-6)}>
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
          {!editing ? (
            <>
              {isOwner && (
                <>
                  <button
                    className="profile-button blog-post-edit-button border border-black px-2 py-0.5 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] text-xs"
                    onClick={() => setEditing(true)}
                    disabled={busy}
                  >
                    Edit
                  </button>
                  <button
                    className="profile-button blog-post-delete-button border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs"
                    onClick={remove}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </>
              )}
              {isAdmin && !isOwner && (
                <button
                  className="profile-button admin-delete-button border border-black px-2 py-0.5 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs"
                  onClick={adminDelete}
                  disabled={busy}
                  title="Admin: Delete post"
                >
                  🛡️ Delete
                </button>
              )}
              {threadRingContext && canModerateRing && (
                <>
                  <button
                    className="profile-button ring-moderate-button border border-black px-2 py-0.5 bg-purple-100 hover:bg-purple-200 shadow-[2px_2px_0_#000] text-xs"
                    onClick={handlePinToggle}
                    disabled={busy}
                    title={post.isPinned ? "Unpin post" : "Pin post"}
                  >
                    {post.isPinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    className="profile-button ring-moderate-button border border-black px-2 py-0.5 bg-orange-100 hover:bg-orange-200 shadow-[2px_2px_0_#000] text-xs"
                    onClick={handleRemoveFromRing}
                    disabled={busy}
                    title="Remove from ThreadRing"
                  >
                    Remove
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Write / Preview toggle */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`px-2 py-0.5 border border-black text-xs shadow-[2px_2px_0_#000] ${view === "write" ? "bg-yellow-200" : "bg-white"}`}
                  onClick={() => setView("write")}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 border border-black text-xs shadow-[2px_2px_0_#000] ${view === "preview" ? "bg-yellow-200" : "bg-white"}`}
                  onClick={() => setView("preview")}
                >
                  Preview
                </button>
              </div>

              <select
                className="border border-black bg-white px-2 py-1 text-xs"
                value={vis}
                onChange={(e) => setVis(e.target.value as Visibility)}
                disabled={busy}
                aria-label="Visibility"
              >
                {VIS_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                className="border border-black bg-white px-2 py-1 text-xs"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                disabled={busy}
                aria-label="Mode"
              >
                <option value="text">Plain text</option>
                <option value="markdown">Markdown</option>
                <option value="html">Raw HTML</option>
              </select>

              <button
                className="border border-black px-2 py-0.5 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] text-xs"
                onClick={save}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                className="border border-black px-2 py-0.5 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] text-xs"
                onClick={cancelEdit}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs"
                onClick={remove}
                disabled={busy}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="blog-post-content">
        {!editing ? (
          <>
            {post.title && (
              <PostHeader post={post} />
            )}
            {post.bodyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
            ) : post.bodyText ? (
              <p>{post.bodyText}</p>
            ) : (
              <div className="italic opacity-70">(No content)</div>
            )}
            
            {/* ThreadRing badges */}
            {featureFlags.threadrings() && post.threadRings && post.threadRings.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-gray-600 font-medium">Posted to:</span>
                  {post.threadRings.map((association) => (
                    <ThreadRingBadge
                      key={association.threadRing.id}
                      threadRing={association.threadRing}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : view === "write" ? (
          <div className="space-y-2">
            <input
              type="text"
              className="w-full border border-black p-2 bg-white font-sans text-lg font-semibold"
              placeholder="Post title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
            <textarea
              className="blog-post-editor w-full border border-black p-2 bg-white font-sans"
              rows={mode === "html" ? 10 : mode === "markdown" ? 8 : 5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {title.trim() && (
              <div className="text-xl font-semibold text-black border-b border-gray-300 pb-2">
                {title}
              </div>
            )}
            <div
              className="blog-post-preview border border-black p-3 bg-white min-h-[120px]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>

      {err && <div className="text-red-700 text-sm mt-2">{err}</div>}

      {/* --- Comments --- */}
        <section className="mt-4 border-t border-black pt-3">
        <button
            type="button"
            onClick={() => {
                setCommentsOpen((o) => !o);
                if (!commentsOpen && commentCount === null) setCommentsVersion((v) => v + 1);
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

    </article>
  );
}
