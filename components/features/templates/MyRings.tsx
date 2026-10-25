import React from 'react';
import Link from 'next/link';
import { useResidentData } from './ResidentDataProvider';
import { viewerIsOwner } from './conditional/IfOwner';
import OwnerNote from './OwnerNote';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { useOwnerRings, ringPath } from '@/lib/templates/owner-rings';

interface MyRingsProps extends UniversalCSSProps {
  /** How many rings to list */
  limit?: number;
  className?: string;
}

export const MY_RINGS_MAX = 50;

/**
 * The rings you're in, as a list of links to each ring's page. The list comes
 * in after the page loads (lib/templates/owner-rings.ts), so the server
 * renders nothing here and hydration agrees.
 */
export default function MyRings(props: MyRingsProps) {
  const { limit, ...rest } = props;
  const { cssProps, componentProps } = separateCSSProps(rest);
  const { className } = componentProps;
  const data = useResidentData();
  const rings = useOwnerRings(data.owner?.handle);

  // Loading, or the ring list can't be had: nothing, rather than "no rings"
  if (rings === null) return null;

  const max = typeof limit === 'number' && Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), MY_RINGS_MAX) : 20;

  if (rings.length === 0) {
    if (!viewerIsOwner(data)) return null;
    return (
      <OwnerNote className={`ts-my-rings ts-my-rings--empty ${className ?? ''}`} style={applyCSSProps(cssProps)}>
        You&apos;re not in any rings yet. <Link href="/threadrings">Find one</Link>.
      </OwnerNote>
    );
  }

  return (
    <ul className={`ts-my-rings ${className ?? ''}`} style={applyCSSProps(cssProps)}>
      {rings.slice(0, max).map((ring) => (
        <li key={ring.slug} className="ts-my-rings-item">
          <a href={ringPath(ring.slug)}>{ring.name}</a>
        </li>
      ))}
    </ul>
  );
}
