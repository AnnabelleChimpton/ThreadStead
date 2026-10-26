import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageMeta from '@/components/ui/layout/PageMeta';
import Button from '@/components/ui/Button';
import type { ActPageProps } from '@/lib/act/act-page';

/**
 * The pages people sign a guestbook or follow someone on, coming from that
 * person's own address (lib/act/actions.ts): the site's own look, none of
 * the person's HTML or CSS, so a page's styles can't dress up the button.
 * The heading takes focus (not the button), so a page can't line up a
 * keypress to land on it.
 */
export function ActShell({ title, target, children }: { title: string; target: ActPageProps['target']; children: React.ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <PageMeta title={title} noIndex />
      <Layout>
        <div className="max-w-md mx-auto my-8 px-4">
          <div className="thread-module p-6 space-y-4">
            <div className="flex items-center gap-3">
              {target.avatarUrl && <img src={target.avatarUrl} alt="" width={48} height={48} className="rounded-full border border-thread-sage" />}
              <h1 ref={heading} tabIndex={-1} className="thread-headline text-2xl m-0 focus:outline-none">{title}</h1>
            </div>
            {children}
          </div>
        </div>
      </Layout>
    </>
  );
}

/**
 * The button that acts. It ignores clicks for its first half second on
 * screen, so a page that opened this one can't time a double click onto it.
 * aria-disabled, not disabled: it stays in the tab order and screen readers
 * hear it, and it works by any means once ready (no pointer-or-keyboard
 * check, which would shut out voice control and switch access).
 */
export function ConfirmButton({ onConfirm, busy, children }: { onConfirm: () => void; busy?: boolean; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (document.visibilityState !== 'visible' || timer) return;
      timer = setTimeout(() => setReady(true), 500);
    };
    arm();
    document.addEventListener('visibilitychange', arm);
    return () => {
      document.removeEventListener('visibilitychange', arm);
      if (timer) clearTimeout(timer);
    };
  }, []);
  const off = !ready || !!busy;
  return (
    <Button type="submit" aria-disabled={off} onClick={(event) => { if (off) { event.preventDefault(); return; } onConfirm(); }}>
      {children}
    </Button>
  );
}

/** For someone not signed in: log in and come straight back here */
export function SignedOut({ what, nextPath }: { what: string; nextPath: string }) {
  return (
    <div className="space-y-3">
      <p className="m-0">Log in to {what}. You&apos;ll come right back here.</p>
      <p className="m-0 text-sm text-thread-sage">Apps like Bluesky open links in their own browser, so you may need to log in again.</p>
      <p className="m-0 flex gap-3 items-center">
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="thread-button">Log in</Link>
        <Link href="/signup" className="underline">Make an account</Link>
      </p>
    </div>
  );
}

/** "Signing as annabelle. Not you? Log out" */
export function SignedInAs({ verb, viewer }: { verb: string; viewer: NonNullable<ActPageProps['viewer']> }) {
  const logOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  };
  return (
    <p className="m-0 text-sm">
      {verb} as <strong>{viewer.username}</strong>. Not you?{' '}
      <button type="button" className="ts-bare underline" onClick={() => void logOut()}>Log out</button>
    </p>
  );
}
