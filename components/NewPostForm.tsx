import React, { useMemo, useState, useEffect } from "react";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";
import Preview from "@/components/PreviewForm";
import hljs from "highlight.js"; // Ensure highlight.js is imported

type Visibility = "public" | "followers" | "friends" | "private";
type Mode = "text" | "markdown" | "html";
type View = "write" | "preview";

type NewPostFormProps = {
  onPosted?: () => void | Promise<void>;
  postId?: string; // Optional prop to edit an existing post
  existingPost?: { title?: string; bodyMarkdown: string; bodyHtml: string; visibility: Visibility }; // Existing post data
};

const VIS_OPTS: { v: Visibility; label: string }[] = [
  { v: "public", label: "Public" },
  { v: "followers", label: "Followers" },
  { v: "friends", label: "Friends" },
  { v: "private", label: "Only Me" },
];

const MODES: { v: Mode; label: string }[] = [
  { v: "text", label: "Plain text" },
  { v: "markdown", label: "Markdown" },
  { v: "html", label: "Raw HTML" },
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

export default function NewPostForm({
  onPosted,
  postId,
  existingPost, // Accepting existing post data for editing
}: NewPostFormProps) {
  const [title, setTitle] = useState(existingPost?.title || "");
  const [text, setText] = useState(existingPost?.bodyMarkdown || "");
  const [vis, setVis] = useState<Visibility>(existingPost?.visibility || "public");
  const [mode, setMode] = useState<Mode>("text");
  const [view, setView] = useState<View>("write");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewHtml = useMemo(() => {
    if (!text.trim()) return "<p class='opacity-60'>(Nothing to preview)</p>";
    if (mode === "markdown") return markdownToSafeHtml(text);
    if (mode === "html") return cleanAndNormalizeHtml(text);
    return textToHtml(text);
  }, [text, mode]);

  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title || "");
      setText(existingPost.bodyMarkdown);
      setVis(existingPost.visibility);
    }

    // Highlight the content after it's loaded (even for write mode)
    highlightCodeBlocks();
  }, [existingPost]);

  const highlightCodeBlocks = () => {
    // Trigger highlighting for the current content
    const blocks = document.querySelectorAll("pre code");
    blocks.forEach((block) => hljs.highlightElement(block as HTMLElement));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;

    setBusy(true);
    setErr(null);

    try {
      const capRes = await fetch("/api/cap/post", { method: "POST" });
      if (capRes.status === 401) {
        setErr("Please log in to post.");
        setBusy(false);
        return;
      }
      if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
      const { token } = await capRes.json();

      const payload: Record<string, any> = { visibility: vis, cap: token };
      if (title.trim()) payload.title = title.trim();
      if (mode === "markdown") payload.bodyMarkdown = body;
      else if (mode === "html") payload.bodyHtml = body;
      else payload.bodyText = body;

      const res = await fetch(postId ? `/api/posts/update/${postId}` : "/api/posts/create", {
        method: postId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`create failed: ${res.status}`);

      setTitle("");
      setText("");
      setView("write");
      await onPosted?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-black p-3 bg-white shadow-[2px_2px_0_#000] space-y-3">
      {/* Write / Preview toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`px-2 py-1 border border-black text-xs shadow-[2px_2px_0_#000] ${view === "write" ? "bg-yellow-200" : "bg-white"}`}
          onClick={() => setView("write")}
        >
          Write
        </button>
        <button
          type="button"
          className={`px-2 py-1 border border-black text-xs shadow-[2px_2px_0_#000] ${view === "preview" ? "bg-yellow-200" : "bg-white"}`}
          onClick={() => setView("preview")}
        >
          Preview
        </button>
      </div>

      {view === "write" ? (
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
            className="w-full border border-black p-2 bg-white font-sans"
            rows={mode === "html" ? 10 : mode === "markdown" ? 8 : 5}
            placeholder={mode === "markdown" ? "Write Markdown…" : "Write your post…"}
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
          <Preview content={previewHtml} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Visibility</label>
        <select
          className="border border-black bg-white px-2 py-1"
          value={vis}
          onChange={(e) => setVis(e.target.value as Visibility)}
          disabled={busy}
        >
          {VIS_OPTS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="text-sm ml-2">Mode</label>
        <select
          className="border border-black bg-white px-2 py-1"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          disabled={busy}
        >
          {MODES.map((m) => (
            <option key={m.v} value={m.v}>
              {m.label}
            </option>
          ))}
        </select>

        <button
          className="ml-auto border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
          disabled={busy || !text.trim()}
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>

      {err && <div className="text-red-700 text-sm">{err}</div>}
    </form>
  );
}
