// components/FollowButton.tsx
import React, { useEffect, useState, useCallback } from "react";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useResidentHost } from "@/contexts/ResidentHostContext";
import { actionUrl, openAction } from "@/lib/act/actions";
import { useSiteConfig } from "@/hooks/useSiteConfig";

type Rel = "loading" | "anon" | "owner" | "none" | "following" | "followed_by" | "friends";

export default function FollowButton({
  username,
  onStatus,
  buttonClassName = "",
}: {
  username: string;
  onStatus?: (status: Rel) => void;
  /** Added to the Follow/Unfollow button: the profile header passes
      ts-profile-button, so a theme styles it like Message and Block */
  buttonClassName?: string;
}) {
  const residentHost = useResidentHost();
  const { config } = useSiteConfig();
  const [status, setStatus] = useState<Rel>("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    const r = await fetch(`/api/rel/${encodeURIComponent(username)}`);
    if (!r.ok) { setErr(`rel ${r.status}`); return; }
    const data = await r.json();
    const s: Rel = data.status || "none";
    setStatus(s);
    onStatus?.(s);
  }, [username, onStatus]);

  useEffect(() => { refresh(); }, [refresh]);

  async function follow() {
    setBusy(true); setErr(null);
    try {
      const r = await csrfFetch(`/api/follow/${encodeURIComponent(username)}`, { method: "POST" });
      if (r.status === 401) { setErr("Please log in."); return; }
      if (!r.ok) throw new Error(`follow ${r.status}`);
      await refresh();
    } catch (e:any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function unfollow() {
    setBusy(true); setErr(null);
    try {
      const r = await csrfFetch(`/api/follow/${encodeURIComponent(username)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`unfollow ${r.status}`);
      await refresh();
    } catch (e:any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <div className="text-sm opacity-70">…</div>;
  if (status === "owner") return null;
  if (status === "anon") {
    // On their own address nobody's signed in: following happens on a page
    // of the main site (lib/act/actions.ts), which shows the result
    if (residentHost) {
      return (
        <a
          href={actionUrl(residentHost.mainSiteUrl, "follow", username)}
          onClick={(event) => openAction(event, residentHost.mainSiteUrl, "follow", username)}
          className={`thread-button text-sm ${buttonClassName}`}
        >
          Follow {username}<span className="sr-only"> (opens {config.site_name})</span>
        </a>
      );
    }
    return <span className="thread-label">log in to follow</span>;
  }

  // Decide label & action
  const showFollow = status === "none" || status === "followed_by";
  const followLabel = status === "followed_by" ? "Follow Back" : "Follow";
  const showUnfollow = status === "following" || status === "friends";

  return (
    <div className="flex items-center gap-2">
      {showFollow && (
        <button
          onClick={follow}
          disabled={busy}
          className={`thread-button text-sm disabled:opacity-50 ${buttonClassName}`}
          aria-label={followLabel}
        >
          {busy ? "Working…" : followLabel}
        </button>
      )}

      {showUnfollow && (
        <button
          onClick={unfollow}
          disabled={busy}
          className={`px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozy-sm transition-all disabled:opacity-50 ${buttonClassName}`}
          aria-label="Unfollow"
        >
          {busy ? "Working…" : "Unfollow"}
        </button>
      )}

      <span className="text-xs opacity-70">
        {status === "friends" ? "Friends" : status === "followed_by" ? "Follows you" : null}
      </span>

      {err && <span className="text-red-700 text-xs">{err}</span>}
    </div>
  );
}
