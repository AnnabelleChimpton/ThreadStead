import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useResidentData } from './ResidentDataProvider';
import { viewerIsOwner } from './conditional/IfOwner';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { useOwnerRings, ringPath } from '@/lib/templates/owner-rings';

interface RingNavProps extends UniversalCSSProps {
  /** The ring's slug, the last part of its address (/tr/<slug>) */
  ring?: string;
  className?: string;
}

/** The slugs ring addresses use (pages/neighborhood/walk.tsx checks the same) */
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

export type WalkGo = 'prev' | 'random' | 'next';

/**
 * Where Previous / Random / Next go: the ring walk (pages/neighborhood/walk.tsx,
 * lib/pixel-homes/ring-walk.ts), which works out the member home on click.
 * It walks the ring's members in house-number order, the ring street's order,
 * so prev and next stay put. `from` is the owner's house number: next is the
 * first member after it, prev the last one before it, both wrapping round.
 */
export function ringWalkHref(slug: string, go: WalkGo, houseNumber: number | null | undefined): string {
  const n = typeof houseNumber === 'number' && houseNumber > 0 ? houseNumber : 0;
  const from = go === 'prev' ? Math.max(0, n - 1) : n;
  return `/neighborhood/walk?ring=${encodeURIComponent(slug)}&from=${from}&go=${go}`;
}

/**
 * Webring links for one of your rings: previous, the ring's page, random,
 * next. Links only; nothing is looked up until someone clicks. Shown once
 * the owner's ring list (lib/templates/owner-rings.ts) says they're in a
 * public ring with that slug; otherwise visitors see nothing and the owner
 * gets a note.
 */
export default function RingNav(props: RingNavProps) {
  const { ring: ringProp, ...rest } = props;
  const { cssProps, componentProps } = separateCSSProps(rest);
  const { className } = componentProps;
  const data = useResidentData();
  const rings = useOwnerRings(data.owner?.handle);
  const isOwner = viewerIsOwner(data);
  const slug = typeof ringProp === 'string' ? ringProp.trim().toLowerCase() : '';

  const note = (text: string) => (
    <p
      className={`ts-ring-nav ts-ring-nav--note text-sm text-thread-sage border border-dashed border-thread-sage/60 rounded p-2 ${className ?? ''}`}
      style={applyCSSProps(cssProps)}
    >
      {text} Only you see this note.
    </p>
  );

  if (!SLUG.test(slug)) {
    return isOwner ? note('RingNav needs the ring it links, like ring="my-ring".') : null;
  }
  if (rings === null) return null;

  // The walk only goes through public rings
  const ring = rings.find((r) => r.slug === slug && r.visibility === 'public');
  if (!ring) {
    return isOwner ? note(`You're not in a public ring called "${slug}", so visitors see nothing here.`) : null;
  }

  const number = data.pixelHome?.number;
  return (
    <nav
      className={`ts-ring-nav flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${className ?? ''}`}
      style={applyCSSProps(cssProps)}
      aria-label={`${ring.name} webring`}
    >
      <a className="ts-ring-nav-prev" href={ringWalkHref(ring.slug, 'prev', number)} rel="prev">
        <PixelIcon name="arrow-left" size={14} className="inline-block align-[-2px] mr-1" />
        Previous
      </a>{' '}
      <a className="ts-ring-nav-home font-semibold" href={ringPath(ring.slug)}>
        {ring.name}
      </a>{' '}
      <a className="ts-ring-nav-random" href={ringWalkHref(ring.slug, 'random', number)}>
        <PixelIcon name="dice" size={14} className="inline-block align-[-2px] mr-1" />
        Random
      </a>{' '}
      <a className="ts-ring-nav-next" href={ringWalkHref(ring.slug, 'next', number)} rel="next">
        Next
        <PixelIcon name="arrow-right" size={14} className="inline-block align-[-2px] ml-1" />
      </a>
    </nav>
  );
}
