import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { widgetFrameClassName } from '@/components/widgets';
import type { FirstSteps } from '@/lib/domain/users/first-steps';

interface FirstStepsChecklistProps {
  username: string;
  steps: FirstSteps;
  foundersNote?: string;
}

// A cookie, not localStorage, so the server can leave the list out entirely
export const FIRST_STEPS_HIDDEN_COOKIE = 'ts_first_steps_hidden';

/**
 * The newcomer's list on the logged-in home. Each item ticks itself off from
 * what they've done; the list can be hidden once all of them are.
 */
export default function FirstStepsChecklist({ username, steps, foundersNote }: FirstStepsChecklistProps) {
  // Ring membership is on Ring Hub; null until we know (or if the hub is down)
  const [inRing, setInRing] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/threadrings/my-memberships')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && Array.isArray(data?.rings)) setInRing(data.rings.length > 0);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const items = [
    { done: steps.house, label: 'Pick your house', href: `/home/${username}/decorate` },
    { done: steps.yard, label: 'Decorate your yard', href: `/home/${username}/decorate` },
    { done: steps.post, label: 'Write a first post', href: '/post/new' },
    { done: steps.guestbook, label: "Sign a neighbor's guestbook", href: '/neighborhood' },
    { done: inRing === true, label: 'Join a ring', href: '/threadrings' },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone && hidden) return null;

  const hide = () => {
    document.cookie = `${FIRST_STEPS_HIDDEN_COOKIE}=${encodeURIComponent(username)}; path=/; max-age=31536000; samesite=lax`;
    setHidden(true);
  };

  return (
    <section aria-labelledby="first-steps-title" className={`${widgetFrameClassName} mb-4 w-full max-w-full`}>
      <div className="widget-header mb-2 flex items-baseline justify-between gap-2">
        <h3 id="first-steps-title" className="widget-title font-headline text-base font-bold leading-tight text-nb-ink">
          First steps
        </h3>
        <span className="thread-label">{doneCount} of {items.length}</span>
      </div>

      {foundersNote && (
        <div className="mb-3 border-b-2 border-dotted border-nb-ink-mid/40 pb-3">
          <p className="thread-label mb-1">A note from the founder</p>
          <p className="text-sm leading-relaxed text-nb-ink">{foundersNote}</p>
        </div>
      )}

      <ul className="space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border-2 border-nb-ink-mid bg-nb-paper text-nb-ink"
            >
              {item.done && <PixelIcon name="check" size={14} />}
            </span>
            {item.done ? (
              <span className="text-nb-ink-mid">
                {item.label}
                <span className="sr-only"> (done)</span>
              </span>
            ) : (
              <Link href={item.href} className="font-semibold text-nb-ink">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {allDone && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm text-nb-ink">
          <span>All five done.</span>
          <button onClick={hide} className="ts-bare underline">
            Hide this list
          </button>
        </div>
      )}
    </section>
  );
}
