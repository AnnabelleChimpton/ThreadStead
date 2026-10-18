import React, { useState } from "react";
import Link from "next/link";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import {
  PUBLIC_ONLY_REASON,
  REMOVED_BEFORE_REASON,
  type RingPostResult,
} from "@/lib/domain/posts/ring-submission";

const FALLBACK_REASON = "Ring Hub didn't respond. Try again later.";

// Sending again can't change these.
const FINAL_REASONS = new Set([PUBLIC_ONLY_REASON, REMOVED_BEFORE_REASON]);

/** POST /api/posts/rings. Throws with a short message when the request itself fails. */
export async function sendExistingPostToRings(
  postId: string,
  rings: string[],
  promptId?: string
): Promise<RingPostResult[]> {
  const res = await csrfFetch("/api/posts/rings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, rings, ...(promptId ? { promptId } : {}) }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Couldn't reach the server. Try again.");
  return data.rings as RingPostResult[];
}

/** Newer results replace older ones for the same ring; order is kept. */
export function mergeRingResults(previous: RingPostResult[], next: RingPostResult[]): RingPostResult[] {
  const bySlug = new Map(next.map((r) => [r.slug, r]));
  const merged = previous.map((r) => {
    const update = bySlug.get(r.slug);
    // A retry that only reached the membership check reports the slug as the
    // name; keep the real name from before.
    return update ? { ...update, name: update.name === update.slug ? r.name : update.name } : r;
  });
  const seen = new Set(previous.map((r) => r.slug));
  return [...merged, ...next.filter((r) => !seen.has(r.slug))];
}

/**
 * Where a post landed, ring by ring, with "Try again" for the rings it missed.
 * Used by the composer after publishing and by "Add to a ring" on a post.
 */
export default function RingResultsList({
  postId,
  rings,
  promptId,
  onChange,
}: {
  postId: string;
  rings: RingPostResult[];
  promptId?: string;
  onChange: (rings: RingPostResult[]) => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const posted = rings.filter((r) => r.status === "posted");
  const pending = rings.filter((r) => r.status === "pending");
  const failed = rings.filter((r) => r.status === "failed");
  const retryable = failed.filter((r) => !FINAL_REASONS.has(r.reason || ""));

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const results = await sendExistingPostToRings(postId, retryable.map((r) => r.slug), promptId);
      onChange(mergeRingResults(rings, results));
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Couldn't reach the server. Try again.");
    } finally {
      setRetrying(false);
    }
  };

  const ringLinks = (list: RingPostResult[]) =>
    list.map((r, i) => (
      <React.Fragment key={r.slug}>
        {i > 0 && ", "}
        <Link href={`/tr/${r.slug}`} className="underline">{r.name}</Link>
      </React.Fragment>
    ));

  return (
    <div className="space-y-3">
      {posted.length > 0 && <p>Posted to: {ringLinks(posted)}</p>}
      {pending.length > 0 && <p>Waiting for a moderator in: {ringLinks(pending)}</p>}
      {failed.length > 0 && (
        <div>
          <p>Not posted to:</p>
          <ul className="list-disc pl-6 mt-1 space-y-1">
            {failed.map((r) => (
              <li key={r.slug}>
                <strong>{r.name}</strong> — {r.reason || FALLBACK_REASON}
              </li>
            ))}
          </ul>
          {retryable.length > 0 && (
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="thread-button-secondary mt-3 disabled:opacity-50"
            >
              {retrying ? "Trying again…" : "Try again"}
            </button>
          )}
          {retryError && <p role="alert" className="mt-2 text-sm text-red-700">{retryError}</p>}
        </div>
      )}
    </div>
  );
}
