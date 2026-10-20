import React from 'react';
import HouseSVG from '@/components/pixel-homes/HouseSVG';
import { useResidentData } from './ResidentDataProvider';
import { viewerIsOwner } from './conditional/IfOwner';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

interface MyHouseProps extends Omit<UniversalCSSProps, 'width'> {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MY_HOUSE_WIDTHS = { sm: 128, md: 256, lg: 512 } as const;

/** The yard picture's shape: CARD_SIZE in lib/pixel-homes/snapshot/render.tsx (server only, so copied) */
const CARD = { width: 512, height: 352 };

export function homePath(handle: string): string {
  return `/home/${encodeURIComponent(handle)}`;
}

/**
 * Your pixel home, small, linking to it. The yard's share picture when it has
 * been drawn (lib/pixel-homes/snapshot), else the house itself (HouseSVG).
 * Both come from residentData.pixelHome, read on the server
 * (lib/templates/page-home.ts), so the server renders it whole.
 */
export default function MyHouse(props: MyHouseProps) {
  const { size, ...rest } = props;
  const { cssProps, componentProps } = separateCSSProps(rest);
  const { className } = componentProps;
  const data = useResidentData();
  const home = data.pixelHome;
  const handle = data.owner?.handle;

  if (home === null || !handle) return null;
  if (home === undefined) {
    // Not loaded here (the editor's preview): the owner hears where it goes
    if (!viewerIsOwner(data)) return null;
    return (
      <p
        className={`ts-my-house ts-my-house--note text-sm text-thread-sage border border-dashed border-thread-sage/60 rounded p-2 ${className ?? ''}`}
        style={applyCSSProps(cssProps)}
      >
        Your pixel home shows here on your page.
      </p>
    );
  }

  const width = MY_HOUSE_WIDTHS[size ?? 'md'] ?? MY_HOUSE_WIDTHS.md;
  const name = data.owner.displayName || handle;
  const label = `${name}'s pixel home`;

  return (
    <a
      href={homePath(handle)}
      className={`ts-my-house inline-block ${className ?? ''}`}
      style={{ maxWidth: '100%', ...applyCSSProps(cssProps) }}
      title={label}
    >
      {home.snapshotCardUrl ? (
        <img
          src={home.snapshotCardUrl}
          alt={label}
          width={width}
          height={Math.round((width * CARD.height) / CARD.width)}
          loading="lazy"
          className="block max-w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <span className="block" style={{ width, maxWidth: '100%' }} role="img" aria-label={label}>
          <HouseSVG template={home.template} palette={home.palette} customizations={home.customizations} className="block w-full h-auto" />
        </span>
      )}
    </a>
  );
}
