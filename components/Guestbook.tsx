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
  const [currentUser, setCurrentUser] = useState<{ id: string; isProfileOwner: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ entryId: string; message: string } | null>(null);

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
      } catch (e: unknown) {
        if (alive) setError((e as Error)?.message || "Failed to load guestbook");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  // Check if current user is the profile owner
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!alive) return;
        if (res.ok) {
          const userData = await res.json();
          if (userData?.loggedIn && userData?.user) {
            // Check if this user owns the profile we're viewing
            const profileRes = await fetch(`/api/profile/${encodeURIComponent(username)}`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              const isOwner = userData.user.id === profileData.userId;
              setCurrentUser({
                id: userData.user.id,
                isProfileOwner: isOwner
              });
            }
          }
        }
      } catch {
        // Silently handle errors - user not logged in or other issues
      }
    })();
    return () => { alive = false; };
  }, [username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1) mint a short-lived capability for this profile's guestbook
      const capRes = await fetch(`/api/cap/guestbook/${encodeURIComponent(username)}`, {
        method: "POST",
      });
      if (capRes.status === 401) {
        setError("Please log in to sign the guestbook.");
        setSubmitting(false);
        return;
      }
      if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
      const { token } = await capRes.json();

      // 2) use the capability in the POST
      const res = await fetch(`/api/guestbook/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg.trim(), cap: token }),
      });
      if (!res.ok) throw new Error(`POST failed: ${res.status}`);
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setMsg("");
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to sign guestbook");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteClick(entry: Entry) {
    setConfirmDelete({
      entryId: entry.id,
      message: entry.message
    });
  }

  function cancelDelete() {
    setConfirmDelete(null);
  }

  async function confirmDeleteEntry() {
    if (!confirmDelete) return;
    
    setDeletingId(confirmDelete.entryId);
    setError(null);
    
    try {
      const res = await fetch(`/api/guestbook/delete/${confirmDelete.entryId}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Delete failed: ${res.status}`);
      }
      
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setConfirmDelete(null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  function canDeleteEntry(entry: Entry): boolean {
    if (!currentUser) return false;
    // Profile owner can delete any entry, or user can delete their own entry
    return currentUser.isProfileOwner || entry.authorId === currentUser.id;
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
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-xs opacity-70 mb-1">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.authorId ? ` · by ${e.authorId}` : " · by anonymous"}
                  </div>
                  <p>{e.message}</p>
                </div>
                {canDeleteEntry(e) && (
                  <button
                    onClick={() => handleDeleteClick(e)}
                    disabled={deletingId === e.id}
                    className="ml-2 px-2 py-1 text-xs border border-red-600 bg-red-100 hover:bg-red-200 text-red-800 shadow-[1px_1px_0_#000] disabled:opacity-50"
                    title="Delete this entry"
                  >
                    {deletingId === e.id ? "..." : "×"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0_#000] p-4 w-80 pointer-events-auto">
            <h4 className="font-bold mb-2 text-lg">Delete Entry?</h4>
            <p className="mb-3 text-sm text-gray-700">
              This action cannot be undone.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 p-2 mb-4 text-xs">
              &quot;{confirmDelete.message.length > 80 
                ? confirmDelete.message.substring(0, 80) + "..." 
                : confirmDelete.message}&quot;
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelDelete}
                className="px-3 py-1 text-sm border border-black bg-white hover:bg-gray-50 shadow-[2px_2px_0_#000]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntry}
                disabled={deletingId === confirmDelete.entryId}
                className="px-3 py-1 text-sm border border-black bg-red-200 hover:bg-red-300 shadow-[2px_2px_0_#000] disabled:opacity-50"
              >
                {deletingId === confirmDelete.entryId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
