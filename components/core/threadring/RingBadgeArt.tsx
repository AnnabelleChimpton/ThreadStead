import React, { useMemo } from 'react';
import { BADGE_HEIGHT, BADGE_WIDTH, drawBadge, type BadgeDesign } from '@/lib/rings/badge-art';

interface RingBadgeArtProps {
  design: BadgeDesign;
  /** The ring's slug: what the badge says when its words have nothing drawable */
  slug: string;
  /** Whole-number zoom; the pixels stay square */
  scale?: number;
  /** What a screen reader hears; the words on the badge if not given. null when text beside it says it */
  label?: string | null;
  className?: string;
}

/**
 * A ring badge drawn in the browser by the same renderer as the saved PNG
 * (lib/rings/badge-art.ts), so what you see is the file.
 */
export default function RingBadgeArt({ design, slug, scale = 1, label, className }: RingBadgeArtProps) {
  const { template, palette, glyph, text } = design;
  const pixels = useMemo(() => drawBadge({ template, palette, glyph, text }, slug), [template, palette, glyph, text, slug]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={BADGE_WIDTH * scale}
      height={BADGE_HEIGHT * scale}
      viewBox={`0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}`}
      shapeRendering="crispEdges"
      role={label === null ? undefined : 'img'}
      aria-label={label === null ? undefined : (label ?? text)}
      aria-hidden={label === null ? true : undefined}
      className={className}
      style={{ display: 'block' }}
    >
      {pixels.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.fill} />
      ))}
    </svg>
  );
}
