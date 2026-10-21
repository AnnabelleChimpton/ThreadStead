// components/Guestbook.tsx
import React, { useEffect, useId, useRef, useState } from "react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import ImprovedBadgeDisplay from "./ImprovedBadgeDisplay";
import { CommentMarkupWithEmojis } from "@/lib/comment-markup";
import Link from "next/link";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Modal from '@/components/ui/feedback/Modal';
import Router from "next/router";
import { guestbookEntryAnchor } from "@/lib/domain/notifications/links";

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

interface GuestbookProps {
  /** The heading above it; null leaves it (and "visitor messages") out */
  heading?: string | null;
  username: string;
  bio?: string;
  /** Where a signer's name links, so you can visit them back: their profile (default) or their pixel home */
  signerLink?: "profile" | "home";
}

export default function Guestbook({ username, bio, signerLink = "profile", heading = "Guestbook" }: GuestbookProps) {
  const { config } = useSiteConfig();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; isProfileOwner: boolean; isAdmin: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ entryId: string; message: string; isAdmin?: boolean } | null>(null);
  const confirmDescId = useId();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

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

  // A link to one entry (#guestbook-entry-<id>, from a guestbook
  // notification) scrolls to it once the entries are in, and marks it.
  const [targetId, setTargetId] = useState<string | null>(null);
  useEffect(() => {
    const prefix = guestbookEntryAnchor("");
    const readHash = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      setTargetId(hash.startsWith(prefix) ? hash.slice(prefix.length) : null);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    Router.events?.on("routeChangeComplete", readHash);
    return () => {
      window.removeEventListener("hashchange", readHash);
      Router.events?.off("routeChangeComplete", readHash);
    };
  }, []);

  useEffect(() => {
    if (!targetId || loading) return;
    document.getElementById(guestbookEntryAnchor(targetId))?.scrollIntoView?.({ block: "center" });
  }, [targetId, loading]);

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
      const res = await csrfFetch(`/api/guestbook/${encodeURIComponent(username)}`, {
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
        res = await csrfFetch("/api/admin/delete-guestbook", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: confirmDelete.entryId })
        });
      } else {
        res = await csrfFetch(`/api/guestbook/delete/${confirmDelete.entryId}`, {
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
      {heading !== null && (
        <div className="mb-3">
          <h3 className="thread-headline text-xl font-bold">{heading}</h3>
          <span className="thread-label">visitor messages</span>
        </div>
      )}
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
              <li
                key={e.id}
                id={guestbookEntryAnchor(e.id)}
                aria-current={e.id === targetId ? "true" : undefined}
                className={`guestbook-entry bg-thread-paper border border-thread-sage/30 p-4 rounded-cozy shadow-cozy-sm${
                  e.id === targetId ? " guestbook-entry-target ring-2 ring-thread-sunset" : ""
                }`}
              >
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
                      {e.authorUsername ? (
                        <>
                          {" · by "}
                          <Link
                            href={signerLink === "home"
                              ? `/home/${encodeURIComponent(e.authorUsername)}`
                              : `/resident/${encodeURIComponent(e.authorUsername)}`}
                            title={signerLink === "home" ? `Visit ${e.authorUsername}'s home` : `Visit ${e.authorUsername}'s page`}
                          >
                            {e.authorUsername}
                          </Link>
                        </>
                      ) : " · anonymous visitor"}
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
                        // Rose ink: the sunset coral was 2.6:1 on the paper
                        className="guestbook-delete px-2 py-1 text-xs border border-[#9B3B2A]/60 bg-thread-sunset/10 hover:bg-thread-sunset/20 text-[#9B3B2A] rounded shadow-sm disabled:opacity-50 transition-all"
                        title="Delete this entry"
                        aria-label="Delete this entry"
                      >
                        {deletingId === e.id ? "..." : <PixelIcon name="close" size={12} className="inline-block align-middle" />}
                      </button>
                    )}
                    {canAdminDeleteEntry(e) && (
                      <button
                        onClick={() => handleDeleteClick(e, true)}
                        disabled={deletingId === e.id}
                        className="px-2 py-1 text-xs border border-red-600/60 bg-red-200/50 hover:bg-red-200/80 text-red-700 rounded shadow-sm disabled:opacity-50 transition-all"
                        title="Admin: Delete this entry"
                        aria-label="Admin: Delete this entry"
                      >
                        {deletingId === e.id ? "..." : <><PixelIcon name="shield" size={12} className="inline-block align-middle" /><PixelIcon name="close" size={12} className="inline-block align-middle" /></>}
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
      <Modal
        isOpen={!!confirmDelete}
        onClose={cancelDelete}
        title="Delete Entry?"
        role="alertdialog"
        maxWidth="max-w-md"
        closeLabel="Cancel"
        describedBy={confirmDescId}
        initialFocusRef={cancelDeleteRef}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              ref={cancelDeleteRef}
              type="button"
              onClick={cancelDelete}
              className="btn btn--secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteEntry}
              disabled={!!confirmDelete && deletingId === confirmDelete.entryId}
              className="btn btn--primary ts-btn-danger disabled:opacity-50"
            >
              {confirmDelete && deletingId === confirmDelete.entryId ? "Deleting..." : "Delete"}
            </button>
          </div>
        }
      >
        {confirmDelete && (
          <div id={confirmDescId}>
            <p className="mb-4 text-sm text-nb-ink-mid">
              This action cannot be undone.
            </p>
            <div className="border border-dotted border-nb-ink-mid/40 p-3 rounded text-xs italic">
              &quot;{confirmDelete.message.length > 80 
                ? confirmDelete.message.substring(0, 80) + "..." 
                : confirmDelete.message}&quot;
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
