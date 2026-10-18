import React, { useEffect, useState } from "react";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type BlockState = "loading" | "blocked" | "not_blocked";

/** Fired on window after a block or unblock; detail is `{ userId }`. */
export const BLOCK_CHANGED_EVENT = "threadstead:block-changed";

const quietButton =
  "px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozy-sm transition-all disabled:opacity-50";

/**
 * Block / Unblock for a profile. Renders nothing for signed-out visitors
 * and for the profile's owner. Uses the same /api/users/block endpoint as
 * the Chat Lounge menu, so blocks show up in /settings/blocks either way.
 */
export default function BlockButton({ userId, name }: { userId: string; name: string }) {
  const { user: currentUser } = useCurrentUser();
  const [state, setState] = useState<BlockState>("loading");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canBlock = !!currentUser && !!userId && currentUser.id !== userId;

  useEffect(() => {
    if (!canBlock) return;
    let cancelled = false;
    fetch("/api/users/block")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { blockedUserIds?: string[] } | null) => {
        if (cancelled || !data) return;
        setState(data.blockedUserIds?.includes(userId) ? "blocked" : "not_blocked");
      })
      .catch(() => { /* button stays hidden */ });
    return () => { cancelled = true; };
  }, [canBlock, userId]);

  async function update(action: "block" | "unblock") {
    setBusy(true);
    setErr(null);
    try {
      const r = await csrfFetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, action }),
      });
      if (!r.ok) throw new Error();
      setState(action === "block" ? "blocked" : "not_blocked");
      setConfirming(false);
      // Lets the profile's Blog tab refresh without a reload
      window.dispatchEvent(new CustomEvent(BLOCK_CHANGED_EVENT, { detail: { userId } }));
    } catch {
      setErr(action === "block" ? "Couldn't block. Try again?" : "Couldn't unblock. Try again?");
    } finally {
      setBusy(false);
    }
  }

  if (!canBlock || state === "loading") return null;

  if (state === "blocked") {
    return (
      <div className="ts-block-control flex items-center gap-2">
        <span className="text-xs opacity-70">Blocked</span>
        <button onClick={() => update("unblock")} disabled={busy} className={`ts-profile-button ts-unblock-button ${quietButton}`}>
          {busy ? "Working…" : "Unblock"}
        </button>
        {err && <span className="text-red-700 text-xs">{err}</span>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="ts-block-control flex items-center gap-2 flex-wrap text-sm" role="group" aria-label={`Block ${name}`}>
        <span>Block {name}? You won&apos;t see their posts or comments, and they can&apos;t message you.</span>
        <button onClick={() => update("block")} disabled={busy} className={`ts-profile-button ts-block-confirm-button ${quietButton} text-red-700`}>
          {busy ? "Working…" : "Block"}
        </button>
        <button onClick={() => setConfirming(false)} disabled={busy} className={`ts-profile-button ${quietButton}`}>
          Cancel
        </button>
        {err && <span className="text-red-700 text-xs">{err}</span>}
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={`ts-profile-button ts-block-button ${quietButton}`}>
      Block
    </button>
  );
}
