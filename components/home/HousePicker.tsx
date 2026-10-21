import React, { useId } from 'react';
import EnhancedHouseCanvas from '../pixel-homes/EnhancedHouseCanvas';
import HouseSVG, { PALETTE_COLORS, AtmosphereSettings } from '../pixel-homes/HouseSVG';
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data';
import { HOUSE_TEMPLATES, HOUSE_PALETTES, HouseChoice } from '@/lib/pixel-homes/house-choice';

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

/** House + colors with a live preview. Used by the homepage demo and the signup house step. */
export default function HousePicker({ value, onChange, atmosphere, decorations, terrain }: HousePickerProps) {
  const name = useId();
  const houseName = HOUSE_TEMPLATES.find((t) => t.id === value.template)?.name ?? value.template;
  const paletteName = HOUSE_PALETTES.find((p) => p.id === value.palette)?.name ?? value.palette;

  return (
    <div>
      {/* One picture with a name that follows the choice, not its layers */}
      <div className="mx-auto mb-4 w-full max-w-md" role="img" aria-label={`Preview: ${houseName} in ${paletteName}`}>
        <EnhancedHouseCanvas
          template={value.template}
          palette={value.palette}
          atmosphere={atmosphere}
          decorations={decorations}
          terrain={terrain}
        />
      </div>

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
              <HouseSVG template={t.id} palette={value.palette} variant="simplified" className="h-12 w-full" />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="thread-label mb-1.5">Colors</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {HOUSE_PALETTES.map((p) => {
            const colors = PALETTE_COLORS[p.id];
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
                <span aria-hidden="true" className="flex h-4 w-full overflow-hidden rounded-sm border border-nb-ink-mid/50">
                  {[colors.primary, colors.secondary, colors.accent, colors.detail].map((c, i) => (
                    <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="text-center leading-tight">{p.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
