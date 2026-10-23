import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import type { RingToHandOver } from '@/lib/domain/users/leaving';
import { leavingDay } from './leaving-day';

/**
 * Settings > Privacy: delete your account (lib/domain/users/leaving.ts).
 * Rings you own that have other members are handed over first; you confirm
 * by typing your username; it all goes 14 days later.
 */
type State = { deletesAt: string | null; rings: RingToHandOver[] | null };

export default function LeaveHomePageAgain() {
  const { showError } = useToast();
  const [state, setState] = useState<State | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/account/leave')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setState, () => setState({ deletesAt: null, rings: null }));
  }, []);

  const send = async (method: 'POST' | 'DELETE') => {
    setBusy(true);
    const res = await csrfFetch('/api/account/leave', {
      method,
      ...(method === 'POST' && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: typed }) }),
    });
    if (res.ok) return window.location.reload();
    const data = await res.json().catch(() => ({}));
    if (data.rings) setState((s) => s && { ...s, rings: data.rings });
    setBusy(false);
    showError(data.error || "That didn't work. Try again?");
  };

  return (
    <div className="ts-leave-section thread-module">
      <h3 className="text-lg font-bold mb-2">Leave HomePageAgain</h3>
      {!state ? (
        <LoadingSpinner message="Checking…" tone="inherit" className="py-2" />
      ) : state.deletesAt ? (
        <>
          <p className="mb-4">
            Your account will be deleted on {leavingDay(state.deletesAt)}. Until then your page is hidden, and you can
            still change your mind.
          </p>
          <Button variant="secondary" onClick={() => send('DELETE')} disabled={busy}>
            Keep my account
          </Button>
        </>
      ) : (
        <>
          <p className="mb-2">
            Deleting your account removes your page, your house, your posts and comments, and the notes you&apos;ve
            signed in other people&apos;s guestbooks. If you&apos;d like a copy, export your data above first.
          </p>
          <p className="mb-4">
            Your page is hidden as soon as you confirm, and everything is deleted for good 14 days later. Until then
            you can sign in and keep your account.
          </p>
          {state.rings === null ? (
            <p className="mb-4">I couldn&apos;t check your rings just now. Try again in a minute.</p>
          ) : state.rings.length > 0 ? (
            <div className="mb-4">
              <p className="mb-2">First, hand these rings to another member, so someone can still look after them:</p>
              <ul className="list-disc pl-6">
                {state.rings.map((ring) => (
                  <li key={ring.slug}>
                    <Link href={`/tr/${ring.slug}/members`} className="underline">{ring.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Type your username to confirm
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="border border-thread-sage rounded px-2 py-1"
                />
              </label>
              <Button variant="danger" onClick={() => send('POST')} disabled={busy || !typed.trim()}>
                Delete my account
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
