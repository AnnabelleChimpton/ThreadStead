// components/Guestbook.tsx
import React, { useEffect, useState } from "react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import ImprovedBadgeDisplay from "./ImprovedBadgeDisplay";
import { CommentMarkupWithEmojis } from "@/lib/comment-markup";

type Entry = {
  id: string;
  profileOwner: string;
  authorId: string | null;
  authorUsername?: string | null;
  message: string;
  createdAt: string;
  status: "visible" | "hidden" | "removed" | string;
  signature?: string | null;
};

export default function Guestbook({ username, bio }: { username: string; bio?: string }) {
  const { config } = useSiteConfig();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; isProfileOwner: boolean; isAdmin: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ entryId: string; message: string; isAdmin?: boolean } | null>(null);

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
              const isAdmin = userData.user.role === "admin";
              setCurrentUser({
                id: userData.user.id,
                isProfileOwner: isOwner,
                isAdmin: isAdmin
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

  function handleDeleteClick(entry: Entry, isAdminDelete = false) {
    setConfirmDelete({
      entryId: entry.id,
      message: entry.message,
      isAdmin: isAdminDelete
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
      let res;
      if (confirmDelete.isAdmin) {
        res = await fetch("/api/admin/delete-guestbook", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: confirmDelete.entryId })
        });
      } else {
        res = await fetch(`/api/guestbook/delete/${confirmDelete.entryId}`, {
          method: "DELETE"
        });
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Delete failed: ${res.status}`);
      }
      
      // Refresh the entries by refetching
      const entriesRes = await fetch(`/api/guestbook/${encodeURIComponent(username)}`);
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setEntries(Array.isArray(entriesData.entries) ? entriesData.entries : []);
      }
      
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

  function canAdminDeleteEntry(entry: Entry): boolean {
    if (!currentUser) return false;
    // Admin can delete entries that aren't their own and they don't own the profile
    return currentUser.isAdmin && !currentUser.isProfileOwner && entry.authorId !== currentUser.id;
  }

  return (
    <div className="guestbook-section">
      <div className="mb-3">
        <h3 className="thread-headline text-xl font-bold">Guestbook</h3>
        <span className="thread-label">visitor messages</span>
      </div>
      {bio && <p className="text-sm text-thread-sage mb-4">Leave a cozy note for {username}!</p>}

      <div className="thread-divider"></div>
      
      <form onSubmit={onSubmit} className="mb-6">
        <label className="block mb-3">
          <span className="thread-label block mb-2">your message</span>
          <textarea
            className="w-full border border-thread-sage p-3 bg-thread-paper rounded-cozy focus:border-thread-pine focus:ring-1 focus:ring-thread-pine resize-none"
            rows={3}
            placeholder={config.guestbook_prompt}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            disabled={submitting}
          />
        </label>
        <button
          className="thread-button disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting || !msg.trim()}
        >
          {submitting ? "Posting…" : "Sign Guestbook"}
        </button>
      </form>

      {loading ? (
        <div className="text-thread-sage italic">Loading entries…</div>
      ) : error ? (
        <div className="text-thread-sunset bg-red-50 border border-red-200 p-3 rounded-cozy">
          <span className="thread-label">error</span>
          <p className="mt-1">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-thread-sage italic text-center py-6">
          No entries yet — be the first to sign!
        </div>
      ) : (
        <div className="space-y-4">
          <span className="thread-label">{entries.length} messages</span>
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="guestbook-entry bg-thread-paper border border-thread-sage/30 p-4 rounded-cozy shadow-cozySm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="thread-label mb-2">
                      {new Date(e.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                      {e.authorUsername ? ` · by ${e.authorUsername}` : " · anonymous visitor"}
                    </div>
                    
                    {/* User badges for authenticated users */}
                    {e.authorId && (
                      <div className="mb-2">
                        <ImprovedBadgeDisplay 
                          userId={e.authorId} 
                          context="comments" 
                          layout="compact"
                        />
                      </div>
                    )}
                    
                    <div className="text-thread-charcoal leading-relaxed">
                      <CommentMarkupWithEmojis text={e.message} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canDeleteEntry(e) && (
                      <button
                        onClick={() => handleDeleteClick(e)}
                        disabled={deletingId === e.id}
                        className="px-2 py-1 text-xs border border-thread-sunset/60 bg-thread-sunset/10 hover:bg-thread-sunset/20 text-thread-sunset rounded shadow-sm disabled:opacity-50 transition-all"
                        title="Delete this entry"
                      >
                        {deletingId === e.id ? "..." : "×"}
                      </button>
                    )}
                    {canAdminDeleteEntry(e) && (
                      <button
                        onClick={() => handleDeleteClick(e, true)}
                        disabled={deletingId === e.id}
                        className="px-2 py-1 text-xs border border-red-600/60 bg-red-200/50 hover:bg-red-200/80 text-red-700 rounded shadow-sm disabled:opacity-50 transition-all"
                        title="Admin: Delete this entry"
                      >
                        {deletingId === e.id ? "..." : "🛡️×"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="thread-module p-5 w-80 pointer-events-auto">
            <h4 className="thread-headline text-lg mb-2">Delete Entry?</h4>
            <p className="mb-4 text-sm text-thread-sage">
              This action cannot be undone.
            </p>
            <div className="bg-thread-cream/50 border border-thread-sage/30 p-3 mb-4 rounded text-xs italic">
              &quot;{confirmDelete.message.length > 80 
                ? confirmDelete.message.substring(0, 80) + "..." 
                : confirmDelete.message}&quot;
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntry}
                disabled={deletingId === confirmDelete.entryId}
                className="px-4 py-2 text-sm border border-thread-sunset bg-thread-sunset/20 hover:bg-thread-sunset/30 text-thread-sunset rounded shadow-cozySm disabled:opacity-50 transition-all"
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
