import React from 'react';
import type { ThemeVars } from '@/lib/templates/appearance';

/**
 * A small sample of a theme, drawn from its own variables (lib/templates/
 * appearance.ts readThemeVars), so it's never out of step with the theme:
 * its ground and card, the name in its heading font, a line in its body
 * font, and its accent on a Guestbook chip. Settings > Your page, the CSS
 * editor's theme gallery and signup show it.
 */
export default function ThemeSwatch({ vars, name, line, compact = false }: {
  vars: ThemeVars;
  name: string;
  /** A line in the body font, e.g. the theme's description */
  line?: string;
  /** Just the colours, for a chip beside a radio */
  compact?: boolean;
}) {
  const card = vars.card === 'transparent' ? vars.ground : vars.card;
  if (compact) {
    return (
      <span aria-hidden="true" className="inline-flex shrink-0 border border-black/20" style={{ background: vars.ground }}>
        <span className="w-3 h-4" style={{ background: card }} />
        <span className="w-3 h-4" style={{ background: vars.ink }} />
        <span className="w-3 h-4" style={{ background: vars.accent }} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="block w-full p-3 border border-black/20"
      style={{ background: vars.ground, color: vars.ink, fontFamily: vars.fontBody }}
    >
      <span className="block p-2" style={{ background: card, border: `1px solid ${vars.ink}33` }}>
        <span className="block text-base leading-tight break-words" style={{ fontFamily: vars.fontHead }}>
          {name}
        </span>
        {line && <span className="block text-xs mt-1 opacity-80">{line}</span>}
        <span
          className="inline-block text-[11px] mt-2 px-2 py-0.5"
          style={{ background: vars.accent, color: vars.onAccent }}
        >
          Guestbook
        </span>
      </span>
    </span>
  );
}
