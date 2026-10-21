import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Street from '@/components/pixel-homes/Street';
import WelcomeMusicControl from './WelcomeMusicControl';
import type { Arrival } from '@/lib/pixel-homes/street';

/**
 * The end of signup's "Move in": the new resident's street, with their
 * house set down into its plot between their neighbours, then their
 * address, then on to their home. About five seconds; Skip (focused) or
 * Escape goes straight on.
 *
 * - It covers the page, and the page behind is inert.
 * - Under reduced motion it opens on the last frame.
 * - Screen readers hear one sentence, once the house is in.
 * - If the street can't be read quickly, it goes straight home.
 *
 * The welcome music is started by "Move in" itself (it has to be, inside
 * the click, for phones); this only shows its control.
 */

/** From the street appearing to going home */
export const FINALE_MS = 4500;
/** When the house has landed (the CSS arrival is 0.3 s + 1.1 s) */
export const LANDED_MS = 1500;
/** How long to wait for the street before going home without it */
export const ARRIVAL_TIMEOUT_MS = 3000;

export function arrivalSentence(arrival: Pick<Arrival, 'number' | 'street'>): string {
  return `You live at ${arrival.number} ${arrival.street.name} now.`;
}

interface SignupFinaleAnimationProps {
  username: string;
  onComplete?: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function SignupFinaleAnimation({ onComplete }: SignupFinaleAnimationProps) {
  const router = useRouter();
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [reducedMotion] = useState(prefersReducedMotion);
  const skipRef = useRef<HTMLButtonElement>(null);
  const streetRef = useRef<HTMLDivElement>(null);
  const left = useRef(false);

  // Stable, so nothing below re-runs (refetching, refocusing) when the
  // router or the parent's callback changes identity
  const latest = useRef({ router, onComplete });
  latest.current = { router, onComplete };
  const goHome = useCallback(() => {
    if (left.current) return;
    left.current = true;
    latest.current.router.push('/?welcome=1');
    latest.current.onComplete?.();
  }, []);

  // The page behind can't be reached or scrolled while this is up
  useEffect(() => {
    const page = document.getElementById('__next');
    page?.setAttribute('inert', '');
    page?.setAttribute('aria-hidden', 'true');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skipRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') goHome();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      page?.removeAttribute('inert');
      page?.removeAttribute('aria-hidden');
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [goHome]);

  // Read the street; if it's slow or missing, go home without it
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      if (!cancelled) goHome();
    }, ARRIVAL_TIMEOUT_MS);
    fetch('/api/user/arrival', { credentials: 'include', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Arrival | null) => {
        if (cancelled || left.current) return;
        clearTimeout(timeout);
        if (data?.homes?.length) setArrival(data);
        else goHome();
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        clearTimeout(timeout);
        goHome();
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [goHome]);

  // Once the street is up: say where they live when the house lands, then go
  useEffect(() => {
    if (!arrival) return;
    const sentence = arrivalSentence(arrival);
    const say = setTimeout(() => setAnnouncement(sentence), reducedMotion ? 0 : LANDED_MS);
    const go = setTimeout(goHome, FINALE_MS);
    return () => {
      clearTimeout(say);
      clearTimeout(go);
    };
  }, [arrival, reducedMotion, goHome]);

  // Their lot in the middle, neighbours either side (on a phone the row
  // is wider than the screen)
  useLayoutEffect(() => {
    if (!arrival) return;
    const row = streetRef.current?.querySelector<HTMLElement>('.ts-street');
    const mine = arrival.homes.find((h) => h.number === arrival.number);
    const lot = mine && streetRef.current?.querySelector<HTMLElement>(`[id="lot-${mine.username}"]`);
    if (!row || !lot) return;
    const r = row.getBoundingClientRect();
    const l = lot.getBoundingClientRect();
    row.scrollLeft += l.left + l.width / 2 - (r.left + r.width / 2);
  }, [arrival]);

  if (typeof document === 'undefined') return null;

  const home = arrival?.homes.find((h) => h.number === arrival.number);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-finale-title"
      className="thread-surface fixed inset-0 z-[9999] overflow-y-auto"
    >
      <div className="min-h-full flex flex-col items-center justify-center gap-5 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(6rem,env(safe-area-inset-bottom))]">
        <p id="signup-finale-title" className="thread-label m-0">
          Moving you in…
        </p>

        <div ref={streetRef} className="ts-finale-street w-full min-h-[136px] sm:min-h-[242px]">
          {arrival && home && (
            <Street
              homes={arrival.homes}
              arriving={reducedMotion ? null : home.username}
            />
          )}
        </div>

        {/* One finished sentence, once the house is in */}
        <p role="status" className="thread-headline text-xl sm:text-3xl font-bold text-center m-0 min-h-[2.5rem]">
          {announcement && <span className={reducedMotion ? undefined : 'ts-finale-caption'}>{announcement}</span>}
        </p>

        <button
          ref={skipRef}
          type="button"
          onClick={goHome}
          className="btn btn--secondary min-h-[44px] min-w-[8rem]"
        >
          Skip
        </button>
      </div>

      <WelcomeMusicControl />
    </div>,
    document.body
  );
}
