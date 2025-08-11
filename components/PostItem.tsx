// components/PostItem.tsx
import React, { useMemo, useState } from "react";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";
import { useHighlight } from "@/lib/useHighlight";

type Visibility = "public" | "followers" | "friends" | "private";
type Mode = "text" | "markdown" | "html";
type View = "write" | "preview";

export type Post = {
  id: string;
  createdAt: string; // ISO string from API
  bodyText?: string | null;
  bodyHtml?: string | null;
  visibility: Visibility;
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
  onChanged,
}: {
  post: Post;
  isOwner: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const initialMode: Mode = post.bodyHtml ? "html" : "text";

  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>("write");
  const [text, setText] = useState<string>(post.bodyHtml ?? post.bodyText ?? "");
  const [vis, setVis] = useState<Visibility>(post.visibility);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewHtml = useMemo(() => {
    if (!text.trim()) return "<p class='opacity-60'>(Nothing to preview)</p>";
    if (mode === "markdown") return markdownToSafeHtml(text);
    if (mode === "html") return cleanAndNormalizeHtml(text);
    return textToHtml(text);
  }, [text, mode]);

  const viewRef = useHighlight([post.id, post.bodyHtml, post.bodyText]);
  
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
    setText(post.bodyHtml ?? post.bodyText ?? "");
    setVis(post.visibility);
    setView("write");
    setErr(null);
  }

  return (
    <article className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs opacity-70">
          {new Date(post.createdAt).toLocaleString()}
        </div>

        <div className="flex items-center gap-2">
          {!editing ? (
            isOwner && (
              <>
                <button
                  className="border border-black px-2 py-0.5 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] text-xs"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                >
                  Edit
                </button>
                <button
                  className="border border-black px-2 py-0.5 bg-white hover:bg-red-100 shadow-[2px_2px_0_#000] text-xs"
                  onClick={remove}
                  disabled={busy}
                >
                  Delete
                </button>
              </>
            )
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

      {!editing ? (
        post.bodyHtml ? (
              <div ref={viewRef} dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        ) : post.bodyText ? (
          <p>{post.bodyText}</p>
        ) : (
          <div className="italic opacity-70">(No content)</div>
        )
      ) : view === "write" ? (
        <textarea
          className="w-full border border-black p-2 bg-white font-sans"
          rows={mode === "html" ? 10 : mode === "markdown" ? 8 : 5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
      ) : (
        <div
          className="border border-black p-3 bg-white min-h-[120px]"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      {err && <div className="text-red-700 text-sm mt-2">{err}</div>}
    </article>
  );
}
