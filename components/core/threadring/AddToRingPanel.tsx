import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { RingPostResult } from "@/lib/domain/posts/ring-submission";
import RingResultsList, { sendExistingPostToRings } from "./RingResultsList";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";

interface MyRing {
  slug: string;
  name: string;
}

/**
 * Sends an existing post to rings it isn't in yet. Lists the author's rings,
 * minus the ones the post is already posted to, then shows where it landed.
 */
export default function AddToRingPanel({
  postId,
  alreadyIn,
  onClose,
}: {
  postId: string;
  /** Slugs of rings the post is already posted to. */
  alreadyIn: string[];
  /** `added` is true when at least one ring took the post. */
  onClose: (added: boolean) => void;
}) {
  const [rings, setRings] = useState<MyRing[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [results, setResults] = useState<RingPostResult[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/threadrings/my-memberships");
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { rings: MyRing[] };
        if (alive) setRings(data.rings);
      } catch {
        if (alive) setLoadError("Couldn't load your rings. Try again later.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const available = (rings || []).filter((r) => !alreadyIn.includes(r.slug));

  const toggle = (slug: string) =>
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      const sent = await sendExistingPostToRings(postId, selected);
      // Name rings by what the list showed, in case the hub only knew the slug.
      const nameBySlug = new Map(available.map((r) => [r.slug, r.name]));
      const named = sent.map((r) => ({ ...r, name: r.name === r.slug ? nameBySlug.get(r.slug) || r.name : r.name }));
      if (named.every((r) => r.status === "posted")) {
        onClose(true);
        return;
      }
      setResults(named);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Couldn't reach the server. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-label="Add to a ring"
      className="mb-5 p-4 bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] space-y-3"
    >
      <h3 className="thread-headline text-lg font-bold">Add to a ring</h3>

      {results ? (
        <>
          <RingResultsList postId={postId} rings={results} onChange={setResults} />
          <button
            type="button"
            className="thread-button"
            onClick={() => onClose(results.some((r) => r.status === "posted"))}
          >
            Done
          </button>
        </>
      ) : loadError ? (
        <>
          <ErrorDisplay title={loadError} />
          <button type="button" className="thread-button-secondary" onClick={() => onClose(false)}>Close</button>
        </>
      ) : rings === null ? (
        <LoadingSpinner layout="row" message="Loading your rings…" className="justify-start" />
      ) : available.length === 0 ? (
        <>
          <p>
            {rings.length === 0 ? "You're not in any rings yet." : "This post is already in all your rings."}{" "}
            <Link href="/threadrings" className="underline">Find rings to join</Link>
          </p>
          <button type="button" className="thread-button-secondary" onClick={() => onClose(false)}>Close</button>
        </>
      ) : (
        <>
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {available.map((ring) => (
              <li key={ring.slug}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(ring.slug)}
                    onChange={() => toggle(ring.slug)}
                  />
                  {ring.name}
                </label>
              </li>
            ))}
          </ul>
          {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className="thread-button disabled:opacity-50"
              onClick={send}
              disabled={sending || selected.length === 0}
            >
              {sending ? "Adding…" : "Add"}
            </button>
            <button type="button" className="thread-button-secondary" onClick={() => onClose(false)} disabled={sending}>
              Cancel
            </button>
          </div>
        </>
      )}
    </section>
  );
}
