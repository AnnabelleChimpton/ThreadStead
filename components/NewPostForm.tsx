// components/NewPostForm.tsx
import React, { useState } from "react";

type NewPostFormProps = {
  onPosted?: () => void | Promise<void>;
};

const VIS_OPTS = [
  { v: "public", label: "Public" },
  { v: "followers", label: "Followers" },
  { v: "friends", label: "Friends" },
  { v: "private", label: "Only Me" },
];

export default function NewPostForm({ onPosted }: NewPostFormProps) {
  const [text, setText] = useState("");
  const [vis, setVis] = useState<string>("public");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr(null);
    try {
      const capRes = await fetch("/api/cap/post", { method: "POST" });
      if (capRes.status === 401) { setErr("Please log in."); setBusy(false); return; }
      const { token } = await capRes.json();

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText: text.trim(), visibility: vis, cap: token }),
      });
      if (!res.ok) throw new Error(`create failed: ${res.status}`);

      setText("");
      await onPosted?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-black p-3 bg-white shadow-[2px_2px_0_#000] space-y-2">
      <textarea
        className="w-full border border-black p-2 bg-white"
        rows={3}
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <div className="flex items-center gap-2">
        <label className="text-sm">Visibility</label>
        <select
          className="border border-black bg-white px-2 py-1"
          value={vis}
          onChange={(e) => setVis(e.target.value)}
          disabled={busy}
        >
          {VIS_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <button className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]" disabled={busy || !text.trim()}>
          {busy ? "Posting…" : "Post"}
        </button>
        {err && <span className="text-red-700 text-sm">{err}</span>}
      </div>
    </form>
  );
}
