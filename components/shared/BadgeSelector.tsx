import React from 'react';
import RingBadgeArt from '@/components/core/threadring/RingBadgeArt';
import {
  BADGE_GLYPH_IDS,
  BADGE_PALETTES,
  BADGE_TEMPLATE_IDS,
  badgeDesignFor,
  glyphPixels,
  type BadgeChoice,
  type BadgePaletteId,
} from '@/lib/rings/badge-art';

interface BadgeSelectorProps {
  /** What's been picked; anything left out is the default badge's */
  value: Partial<BadgeChoice>;
  onChange: (value: Partial<BadgeChoice>) => void;
  /** The ring's name, which the badge says unless other words are typed */
  name: string;
  slug: string;
  /** The ring's colour (lib/rings/theme.ts ringBadgePalette); it's chosen with the ring, not here */
  palette: BadgePaletteId;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ts-bare: out of the site CSS's button bevel, so the tile and its outline show
function Tile({ selected, onClick, title, className, children }: {
  selected: boolean;
  onClick: () => void;
  title?: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
      className={`ts-bare ${selected ? 'outline outline-2 outline-offset-2 outline-black' : ''}`}
    >
      <span className={`flex border border-black bg-white p-1 text-xs ${className}`}>{children}</span>
    </button>
  );
}

/**
 * A ring badge's choices: style, picture and words, with the badge
 * drawn as it will be saved, at 1× and 2×. The fork form and the badge
 * designer both use it.
 */
export default function BadgeSelector({ value, onChange, name, slug, palette: paletteId }: BadgeSelectorProps) {
  const design = badgeDesignFor(value, name || 'ThreadRing', paletteId);
  const palette = BADGE_PALETTES[paletteId];
  const pick = (patch: Partial<BadgeChoice>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap">
        <RingBadgeArt design={design} slug={slug} label={`${design.text} badge`} />
        <RingBadgeArt design={design} slug={slug} scale={2} label={`${design.text} badge, twice the size`} />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium mb-2">Style</legend>
        <div className="flex gap-2 flex-wrap">
          {BADGE_TEMPLATE_IDS.map((template) => (
            <Tile key={template} selected={design.template === template} onClick={() => pick({ template })} className="flex-col items-center gap-1">
              <RingBadgeArt design={{ ...design, template }} slug={slug} label={null} />
              {capitalize(template)}
            </Tile>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-sm font-medium mb-2">Picture</legend>
        <div className="flex gap-2 flex-wrap">
          <Tile selected={design.glyph === null} onClick={() => pick({ glyph: null })} className="w-12 h-12 items-center justify-center">
            None
          </Tile>
          {BADGE_GLYPH_IDS.map((glyph) => (
            <Tile
              key={glyph}
              selected={design.glyph === glyph}
              onClick={() => pick({ glyph })}
              title={capitalize(glyph)}
              className="w-12 h-12 items-center justify-center"
            >
              <svg width={36} height={36} viewBox="-1 -1 10 10" shapeRendering="crispEdges" role="img" aria-label={capitalize(glyph)}>
                <rect x={-1} y={-1} width={10} height={10} fill={palette.field} />
                {glyphPixels(glyph, palette.text, palette.hi).map((p, i) => (
                  <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.fill} />
                ))}
              </svg>
            </Tile>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="badge-text" className="block text-sm font-medium mb-2">Badge text</label>
        <input
          id="badge-text"
          type="text"
          placeholder={name}
          maxLength={100}
          value={value.text ?? ''}
          onChange={(e) => pick({ text: e.target.value })}
          className="w-full border border-black p-2 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
        />
        <p className="text-xs text-gray-600 mt-1">Leave it empty to use the ring&apos;s name.</p>
      </div>
    </div>
  );
}
