// components/Guestbook.tsx
import React, { useEffect, useState } from "react";

type Entry = {
  id: string;
  profileOwner: string;
  authorId: string | null;
  message: string;
  createdAt: string;
  status: "visible" | "hidden" | "removed" | string;
  signature?: string | null;
};

export default function Guestbook({ username, bio }: { username: string; bio?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/guestbook/${encodeURIComponent(username)}`);
        if (!alive) return;
        if (!res.ok) throw new Error(`GET failed: ${res.status}`);
        const data = await res.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch (e: any) {
        if (alive) setError(e?.message || "Failed to load guestbook");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/guestbook/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg.trim() }),
      });
      if (!res.ok) throw new Error(`POST failed: ${res.status}`);
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setMsg("");
    } catch (e: any) {
      setError(e?.message || "Failed to sign guestbook");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-black bg-white shadow-[4px_4px_0_#000] p-3">
      <h3 className="text-xl font-bold mb-2">Guestbook</h3>
      {bio && <p className="text-sm opacity-70 mb-3">Leave a note for {username}!</p>}

      <form onSubmit={onSubmit} className="mb-4">
        <label className="block mb-2">
          <span className="sr-only">Message</span>
          <textarea
            className="w-full border border-black p-2 bg-white"
            rows={3}
            placeholder="Say something nice…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            disabled={submitting}
          />
        </label>
        <button
          className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
          disabled={submitting || !msg.trim()}
        >
          {submitting ? "Posting…" : "Sign"}
        </button>
      </form>

      {loading ? (
        <div>Loading entries…</div>
      ) : error ? (
        <div className="text-red-700">Error: {error}</div>
      ) : entries.length === 0 ? (
        <div className="italic opacity-70">No entries yet.</div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
              <div className="text-xs opacity-70 mb-1">
                {new Date(e.createdAt).toLocaleString()}
                {e.authorId ? ` · by ${e.authorId}` : " · by anonymous"}
              </div>
              <p>{e.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
