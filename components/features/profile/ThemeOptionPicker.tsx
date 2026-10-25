import React from 'react';
import { FONT_CHOICES } from '@/lib/templates/appearance';
import { fontFamilies, type ThemeOption } from '@/lib/templates/compilation/theme-options';
import { colorInputValue } from '@/lib/utils/css/color-input';

/**
 * One of a page's theme options (<meta name="color:Accent">, font:…) as a
 * colour well or a font list: in Settings → Your page, and in the HTML
 * editor's Options strip. `saved` is the font the page has, offered when it
 * isn't one of the choices.
 */
export default function ThemeOptionPicker({ option, saved, onChange, compact = false }: {
  option: ThemeOption;
  saved: string;
  onChange: (value: string) => void;
  /** The editor's strip: smaller, side by side */
  compact?: boolean;
}) {
  if (option.type === 'color') {
    return (
      <label className="block text-sm text-nb-ink min-w-0">
        {option.name}
        <span className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={colorInputValue(option.value)}
            onChange={(e) => onChange(e.target.value)}
            className={`${compact ? 'h-7 w-9' : 'h-10 w-14'} border border-black p-0.5 bg-white`}
          />
          <span className="font-mono text-xs break-all">{option.value}</span>
        </span>
      </label>
    );
  }
  return (
    <label className="block text-sm text-nb-ink min-w-0">
      {option.name}
      <select
        value={option.value}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full mt-1 border border-black bg-white ${compact ? 'p-1 text-xs' : 'p-2'}`}
      >
        {!FONT_CHOICES.some((f) => f.stack === saved) && (
          <option value={saved}>Your page&apos;s font ({fontFamilies(saved)[0]})</option>
        )}
        {FONT_CHOICES.map((f) => (
          <option key={f.stack} value={f.stack}>{f.label}</option>
        ))}
      </select>
    </label>
  );
}
