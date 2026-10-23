import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { FIELD, HELP, Heading, Label, ROWS } from "./form";

interface Prompt {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  responseCount: number;
  createdBy?: { profile?: { displayName: string | null } | null };
}

// A new prompt is the one on the ring page unless the host unticks it
const EMPTY = { title: "", description: "", ends: "", show: true };

const day = (value: string, withYear = true) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });

/** "Oct 1 to Nov 30, 2026", or just when it started */
function when(prompt: Prompt): string {
  if (!prompt.endsAt) return day(prompt.startsAt);
  const sameYear = new Date(prompt.startsAt).getFullYear() === new Date(prompt.endsAt).getFullYear();
  return `${day(prompt.startsAt, !sameYear)} to ${day(prompt.endsAt)}`;
}

/**
 * The ring's prompts, for its host and moderators: post one, or take one
 * down. No editing: Ring Hub can't change a post once it's in a ring.
 */
export default function PromptsTab({ ringSlug }: { ringSlug: string }) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [posting, setPosting] = useState(false);
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const base = `/api/threadrings/${encodeURIComponent(ringSlug)}/prompts`;

  const load = useCallback(async () => {
    setFailed(false);
    try {
      // Ended ones too: they're the host's to tidy away
      const res = await fetch(`${base}?includeInactive=true`);
      if (!res.ok) throw new Error(String(res.status));
      setPrompts(await res.json());
    } catch {
      setFailed(true);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    try {
      const res = await csrfFetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          // The end of the day it ends, where the host is
          endsAt: form.ends ? new Date(`${form.ends}T23:59:59`).toISOString() : null,
          isActive: form.show,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't post the prompt. Try again.");
      showSuccess("It's up.");
      setForm(EMPTY);
      await load();
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't post the prompt. Try again.");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (prompt: Prompt) => {
    const ok = await confirm({
      title: `Delete "${prompt.title}"?`,
      message: "Posts written for it stay where they are.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await csrfFetch(`${base}/${encodeURIComponent(prompt.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't delete the prompt. Try again.");
      await load();
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't delete the prompt. Try again.");
    }
  };

  // The ring page shows the first one that's on
  const shownId = prompts?.find((p) => p.isActive)?.id;
  const now = Date.now();

  return (
    <div className="space-y-8">
      <form onSubmit={post}>
        <Heading>New prompt</Heading>
        <p className={HELP}>Something for members to write about. Once it&apos;s up it can&apos;t be changed, only deleted.</p>
        <div className="space-y-4 mt-3 max-w-xl">
          <div>
            <Label htmlFor="prompt-title">Title</Label>
            <input
              id="prompt-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Show us your oldest needles"
              required
              maxLength={200}
              className={FIELD}
            />
          </div>
          <div>
            <Label htmlFor="prompt-description">What to write about</Label>
            <textarea
              id="prompt-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              required
              maxLength={1000}
              className={FIELD}
            />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
            <div>
              <Label htmlFor="prompt-ends" optional>Ends</Label>
              <input
                id="prompt-ends"
                type="date"
                value={form.ends}
                onChange={(e) => setForm({ ...form, ends: e.target.value })}
                className={`${FIELD} w-48`}
              />
            </div>
            <label className="flex items-center gap-2 pb-3 text-nb-ink cursor-pointer">
              <input
                type="checkbox"
                checked={form.show}
                onChange={(e) => setForm({ ...form, show: e.target.checked })}
                className="w-[18px] h-[18px] accent-nb-ink"
              />
              Show it on the ring page
            </label>
          </div>
          <Button type="submit" disabled={posting} className="thread-button disabled:opacity-50">
            {posting ? "Posting..." : "Post prompt"}
          </Button>
        </div>
      </form>

      <div>
        <Heading>Prompts</Heading>
        {failed ? (
          <ErrorDisplay title="Couldn't load the prompts" message="Ring Hub didn't answer. Try again in a minute." onRetry={load} className="mt-3" />
        ) : prompts === null ? (
          <LoadingSpinner message="Loading prompts..." className="py-6" />
        ) : prompts.length === 0 ? (
          <EmptyState variant="plain" title="No prompts yet." description="Post one above and members can write for it." />
        ) : (
          <ul className={`${ROWS} mt-2`}>
            {prompts.map((prompt) => {
              const ended = !!prompt.endsAt && new Date(prompt.endsAt).getTime() < now;
              const from = prompt.createdBy?.profile?.displayName;
              return (
                <li key={prompt.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-bold text-nb-ink text-lg">{prompt.title}</span>
                    {prompt.id === shownId ? (
                      <span className="text-xs font-semibold px-1.5 rounded border border-nb-ink-mid/50 text-nb-ink bg-nb-paper">On the ring page</span>
                    ) : (
                      ended && <span className="text-sm text-nb-ink-mid">Ended</span>
                    )}
                  </div>
                  <p className="text-nb-ink m-0 mt-1 whitespace-pre-wrap">{prompt.description}</p>
                  <div className="text-sm text-nb-ink-mid mt-1">
                    {from && <>From {from} · </>}
                    {when(prompt)} ·{" "}
                    <Link href={`/tr/${encodeURIComponent(ringSlug)}/prompts/${encodeURIComponent(prompt.id)}/responses`} className="underline text-nb-ink">
                      {prompt.responseCount === 1 ? "1 response" : `${prompt.responseCount} responses`}
                    </Link>
                  </div>
                  <div className="mt-3">
                    <Button variant="secondary" size="sm" onClick={() => remove(prompt)}>
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
