import React, { useEffect, useId, useRef, useState } from 'react';
import EnhancedHouseCanvas from '../pixel-homes/EnhancedHouseCanvas';
import HouseSVG, { PALETTE_COLORS, AtmosphereSettings } from '../pixel-homes/HouseSVG';
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data';
import { HOUSE_TEMPLATES, HOUSE_PALETTES, HouseChoice } from '@/lib/pixel-homes/house-choice';
import { CLOSE_UP_MIN_WIDTH, pickCloseUpView, type CloseUpView } from '@/lib/pixel-homes/pixel-scale';

interface HousePickerProps {
  value: HouseChoice;
  onChange: (choice: HouseChoice) => void;
  atmosphere?: AtmosphereSettings;
  decorations?: DecorationItem[];
  terrain?: Record<string, string>;
}

// Radio options are labels, not <button>s, so the site theme's button bevel
// doesn't reach them; the checked one gets the ink border. The input is
// sr-only, so the card wears the site's dashed focus ring for it.
const optionClass =
  'flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-nb-ink-mid/40 bg-nb-paper p-1.5 text-xs font-semibold text-nb-ink ' +
  'hover:border-nb-ink-mid has-[:checked]:border-nb-ink has-[:checked]:shadow-nb-sm has-[:focus-visible]:outline-dashed has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--ha-lav-ink,#5a4fb3)]';

// A demo yard shows more of the scene around the house
const YARD_MIN_WIDTH = 400;

/**
 * The scene cropped to the house, at a whole number of device pixels per art
 * pixel, sized from the width it's given.
 */
function HouseCloseUp({ value, atmosphere, decorations, terrain }: Omit<HousePickerProps, 'onChange'>) {
  const frameRef = useRef<HTMLDivElement>(null);
  const minWidth = decorations?.length ? YARD_MIN_WIDTH : CLOSE_UP_MIN_WIDTH;
  const [view, setView] = useState<CloseUpView>(() => pickCloseUpView(448, 1, minWidth));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // Less the frame's 2px border each side
    const update = (width: number) => setView(pickCloseUpView(width - 4, window.devicePixelRatio || 1, minWidth));
    update(frame.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.contentRect.width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [minWidth]);

  const { scale: k } = view;
  return (
    <div ref={frameRef} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-sm border-2 border-nb-ink-mid/50"
        style={{ width: view.width * k + 4, height: view.height * k + 4 }}
      >
        <div className="absolute" style={{ left: -view.left * k, top: -view.top * k, width: 512 * k }}>
          <EnhancedHouseCanvas
            template={value.template}
            palette={value.palette}
            atmosphere={atmosphere}
            decorations={decorations}
            terrain={terrain}
            pixelPerfect
            fixedScale={k}
          />
        </div>
      </div>
    </div>
  );
}

/** House + colors with a live preview. Used by the homepage demo and the signup house step. */
export default function HousePicker({ value, onChange, atmosphere, decorations, terrain }: HousePickerProps) {
  const name = useId();
  const houseName = HOUSE_TEMPLATES.find((t) => t.id === value.template)?.name ?? value.template;
  const paletteName = HOUSE_PALETTES.find((p) => p.id === value.palette)?.name ?? value.palette;

  return (
    // Side by side when there's room (signup on desktop); stacked otherwise,
    // with the preview held under the site header on a phone so the house
    // stays in view while you pick.
    <div className="@container">
      <div className="@3xl:grid @3xl:grid-cols-[minmax(0,1fr)_20rem] @3xl:items-start @3xl:gap-5">
        <div
          className="sticky z-10 -mx-1 mb-4 bg-nb-paper px-1 pb-2 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 @3xl:mb-0"
          style={{ top: 'var(--nav-height, 0px)' }}
          role="img"
          aria-label={`Preview: ${houseName} in ${paletteName}`}
        >
          {/* One picture with a name that follows the choice, not its layers */}
          <HouseCloseUp value={value} atmosphere={atmosphere} decorations={decorations} terrain={terrain} />
        </div>

        <div>
          <fieldset className="mb-3">
            <legend className="thread-label mb-1.5">House</legend>
            <div className="grid grid-cols-4 gap-2">
              {HOUSE_TEMPLATES.map((t) => (
                <label key={t.id} className={optionClass}>
                  <input
                    type="radio"
                    name={`${name}-house`}
                    value={t.id}
                    checked={value.template === t.id}
                    onChange={() => onChange({ ...value, template: t.id })}
                    className="sr-only"
                  />
                  <HouseSVG template={t.id} palette={value.palette} className="h-12 w-full" />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="thread-label mb-1.5">Colors</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 @3xl:grid-cols-2">
              {HOUSE_PALETTES.map((p) => {
                const colors = PALETTE_COLORS[p.id];
                // What the house really wears: walls first and widest, then roof, trim and door, glass
                const swatch = [
                  { color: colors.base, grow: 'flex-[2]' },
                  { color: colors.primary, grow: 'flex-1' },
                  { color: colors.secondary, grow: 'flex-1' },
                  { color: colors.accent, grow: 'flex-1' },
                ];
                return (
                  <label key={p.id} className={optionClass}>
                    <input
                      type="radio"
                      name={`${name}-palette`}
                      value={p.id}
                      checked={value.palette === p.id}
                      onChange={() => onChange({ ...value, palette: p.id })}
                      className="sr-only"
                    />
                    <span aria-hidden="true" className="flex h-5 w-full overflow-hidden rounded-sm border border-nb-ink-mid/50">
                      {swatch.map((s, i) => (
                        <span key={i} className={s.grow} style={{ backgroundColor: s.color }} />
                      ))}
                    </span>
                    <span className="text-center leading-tight">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
