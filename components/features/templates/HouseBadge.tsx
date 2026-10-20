import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { homePath } from './MyHouse';

interface HouseBadgeProps extends UniversalCSSProps {
  className?: string;
}

/** The 88×31 house badge's address (pages/api/home/[handle]/badge.ts, lib/pixel-homes/house-badge.ts) */
export function houseBadgeSrc(handle: string): string {
  return `/api/home/${encodeURIComponent(handle)}/badge`;
}

/**
 * Your 88×31 house badge, the one beside "Step back outside" on your
 * profile, as a link to your pixel home. Nothing when you have no home.
 */
export default function HouseBadge(props: HouseBadgeProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className } = componentProps;
  const data = useResidentData();
  const handle = data.owner?.handle;
  // null: no home. Left out (the editor's preview): the badge route says for itself
  if (data.pixelHome === null || !handle) return null;
  const name = data.owner.displayName || handle;

  return (
    <a
      href={homePath(handle)}
      className={`ts-house-badge-link inline-block ${className ?? ''}`}
      style={applyCSSProps(cssProps)}
      title={`${name}'s pixel home`}
    >
      <img
        src={houseBadgeSrc(handle)}
        alt={`${name}'s pixel home`}
        width={88}
        height={31}
        className="block"
        style={{ imageRendering: 'pixelated' }}
      />
    </a>
  );
}
