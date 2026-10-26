/**
 * Signing someone's guestbook, coming from their own address
 * (alice.homepageagain.com never sees a session; lib/act/actions.ts). The
 * note is typed here, on the site's own page, and kept as a draft until it's
 * sent. Once signed: back to their address at the note, or, in a pop-up,
 * to act-done.html there (lib/act/finish.ts).
 */
import React, { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { ActShell, ConfirmButton, SignedInAs, SignedOut } from '@/components/features/act/ActShell';
import { loadActPage, type ActPageProps } from '@/lib/act/act-page';
import { finishUrl, navigate } from '@/lib/act/finish';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { CapabilityError, requestCapability } from '@/lib/api/client/capability';

const draftKey = (username: string) => `threadstead:act-draft:guestbook:${username}`;

export default function SignGuestbook(props: ActPageProps) {
  const { target, viewer, backUrl, canSee } = props;
  const [note, setNote] = useState('');
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<React.ReactNode>(null);

  // A note left unsent (the page closed, a log in in between) is still here
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey(target.username));
      if (saved) {
        setNote(saved);
        setRestored(true);
      }
    } catch { /* storage blocked */ }
  }, [target.username]);
  const write = (value: string) => {
    setNote(value);
    try {
      if (value.trim()) window.localStorage.setItem(draftKey(target.username), value);
      else window.localStorage.removeItem(draftKey(target.username));
    } catch { /* storage blocked */ }
  };

  const nextPath = `/act/guestbook/${encodeURIComponent(target.username)}${props.popup ? '?via=popup' : ''}`;

  const sign = async () => {
    if (!note.trim()) {
      setProblem('Write a note first.');
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const cap = await requestCapability(`guestbook/${encodeURIComponent(target.username)}`);
      const res = await csrfFetch(`/api/guestbook/${encodeURIComponent(target.username)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: note.trim(), cap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblem(res.status === 429 && data?.error ? data.error : "That didn't go through. Try again in a moment.");
        return;
      }
      try { window.localStorage.removeItem(draftKey(target.username)); } catch { /* storage blocked */ }
      navigate(finishUrl(props, 'guestbook', data?.entry?.id));
    } catch (error) {
      if (error instanceof CapabilityError && error.status === 401) {
        setProblem(<>You&apos;ve been logged out. <a href={`/login?next=${encodeURIComponent(nextPath)}`} className="underline">Log in again</a> and your note will still be here.</>);
      } else {
        setProblem("That didn't go through. Try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  const title = `Sign ${target.name}'s guestbook`;
  if (!viewer) {
    return (
      <ActShell title={title} target={target}>
        <SignedOut what={`sign ${target.name}'s guestbook`} nextPath={nextPath} />
      </ActShell>
    );
  }
  if (!canSee) {
    return (
      <ActShell title={title} target={target}>
        <p className="m-0">You can&apos;t sign this guestbook.</p>
        <p className="m-0"><a href={backUrl} className="underline">Back to {target.name}&apos;s page</a></p>
      </ActShell>
    );
  }
  return (
    <ActShell title={title} target={target}>
      <SignedInAs verb="Signing" viewer={viewer} />
      {restored && <p className="m-0 text-sm" role="status">Your unsent note is still here.</p>}
      <form className="space-y-3" onSubmit={(event) => event.preventDefault()}>
        <label className="block">
          <span className="thread-label block mb-2">Your note</span>
          <textarea
            className="w-full border border-thread-sage p-3 bg-thread-paper rounded-cozy resize-y"
            rows={4}
            maxLength={2000}
            value={note}
            onChange={(event) => write(event.target.value)}
          />
        </label>
        {problem && <p className="m-0 text-thread-sunset" role="alert">{problem}</p>}
        <div className="flex items-center gap-4">
          <ConfirmButton onConfirm={() => void sign()} busy={busy}>{busy ? 'Signing…' : 'Sign'}</ConfirmButton>
          <a href={backUrl} className="underline">Back to {target.name}&apos;s page</a>
        </div>
      </form>
    </ActShell>
  );
}

export const getServerSideProps: GetServerSideProps<ActPageProps> = (context) => loadActPage(context);
