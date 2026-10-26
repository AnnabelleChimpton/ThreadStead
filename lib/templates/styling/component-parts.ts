/**
 * Parts and tokens: how a page restyles our components (design/component-
 * styling-audit/PLAN.md). One table, two uses:
 *
 * - Site styles off: styles/component-parts.css (written from this table,
 *   kept equal by a test) makes every part follow the page. A part's box
 *   is see-through with an edge in the page's colour, its text is the
 *   page's colour and font. That's what an unset token means.
 * - Site styles on: parts keep the site's look, unless the page sets a
 *   token. Then transformAdvancedCss puts the declarations reading that
 *   token in the page's CSS, ahead of the page's own rules, so the token
 *   wins over the site's look and the page's own rules still win over it.
 *
 * A page sets a token once, `:root { --ts-card: #2a2545 }`, and every
 * component's boxes follow. A part's class (`ts-guestbook-entry`) is its
 * stable handle for anything more.
 */

/** The tokens, what each is, and what an unset one means with site styles off */
export const TOKENS = {
  '--ts-ink': 'Text in components. Unset: the page\'s own text colour.',
  '--ts-font': 'Text font in components. Unset: the page\'s own font.',
  '--ts-font-head': 'Headings in components. Unset: the page\'s own font.',
  '--ts-accent': 'Ticks, sliders and the chosen tab. Unset: the page\'s text colour.',
  '--ts-card': 'Boxes: cards, tabs, posts, guestbook entries, fields and buttons. Unset: see-through.',
  '--ts-edge': 'Their borders. Unset: the page\'s text colour, faded.',
  '--ts-shadow': 'Their shadows, like 3px 3px 0 teal. Unset: none.',
  '--ts-radius': 'Their corners, like 8px. Unset: as they are.',
} as const;

export type Token = keyof typeof TOKENS;

const EDGE = 'var(--ts-edge, color-mix(in srgb, currentColor 35%, transparent))';
const SOLID_EDGE = 'var(--ts-edge, currentColor)';
const CARD = 'var(--ts-card, transparent)';
const SHADOW = 'var(--ts-shadow, none)';
const INK = 'var(--ts-ink)';
const FONT = 'var(--ts-font)';
const HEAD = 'var(--ts-font-head)';

/**
 * A box: background, edge, shadow and corners from the tokens. `background`,
 * not its colour: the site's theme paints some with a gradient, which a
 * colour sits under
 */
const box = (radius: string) => ({
  background: CARD,
  'border-color': EDGE,
  'box-shadow': SHADOW,
  'border-radius': `var(--ts-radius, ${radius})`,
  color: INK,
});

/** A box the site's theme also outlines inside (cards, tabs): the outline takes the edge colour */
const frame = (radius: string) => ({ ...box(radius), 'outline-color': EDGE });

/** A heading inside a component */
const heading = { color: INK, 'font-family': HEAD, 'text-shadow': 'none' };

/** Text that's quieter than the rest (dates, counts, hints) */
const muted = { color: INK, opacity: '0.8' };

export interface Part {
  /** The part's class, `ts-<component>-<part>`: its stable name for a page's CSS */
  part: string;
  /** The component it's part of */
  component: string;
  /** What it is, in a few words, for the component reference */
  what: string;
  /** Narrows it to a state or a pseudo-element: `[aria-selected="true"]`, `::before`, `:hover` */
  state?: string;
  /**
   * Each declaration's value as written for site styles off. One that reads
   * a token also goes in a page's CSS when the page sets that token; one
   * that reads none is only for site styles off (following the page).
   */
  declarations: Record<string, string>;
}

/** Phase 1: the components people use most, and the ones site styles off broke */
export const PARTS: Part[] = [
  // Button
  { component: 'Button', part: 'ts-button', what: 'the button', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'border-radius': 'var(--ts-radius, 4px)', 'font-family': FONT } },

  // RetroCard
  { component: 'RetroCard', part: 'ts-card', what: 'the card', declarations: frame('8px') },
  { component: 'RetroCard', part: 'ts-card-title', what: 'its title', declarations: heading },

  // Tabs
  { component: 'Tabs', part: 'ts-tabs', what: 'the box around the tabs and the panel', declarations: frame('8px') },
  { component: 'Tabs', part: 'ts-tabs-list', what: 'the row of tabs', declarations: { 'border-bottom-color': EDGE } },
  { component: 'Tabs', part: 'ts-tabs-tab', what: 'a tab', declarations: { background: CARD, color: INK, 'border-right-color': EDGE, 'font-family': FONT } },
  { component: 'Tabs', part: 'ts-tabs-tab', what: 'the chosen tab', state: '[aria-selected="true"]', declarations: { background: 'color-mix(in srgb, var(--ts-accent, currentColor) 15%, transparent)' } },
  { component: 'Tabs', part: 'ts-tabs-panel', what: 'the chosen tab\'s content', declarations: { color: INK } },

  // Guestbook
  { component: 'Guestbook', part: 'ts-guestbook-heading', what: 'its heading', declarations: heading },
  { component: 'Guestbook', part: 'ts-guestbook-label', what: 'small labels ("Your message", dates)', declarations: { color: INK, 'font-family': FONT, opacity: '0.8' } },
  { component: 'Guestbook', part: 'ts-guestbook-muted', what: 'notes and hints', declarations: muted },
  { component: 'Guestbook', part: 'ts-guestbook-divider', what: 'the line under the heading', declarations: { 'border-top-color': EDGE } },
  { component: 'Guestbook', part: 'ts-guestbook-divider', what: 'the line\'s stitching', state: '::before', declarations: { display: 'none' } },
  { component: 'Guestbook', part: 'ts-guestbook-field', what: 'the message box', declarations: { ...box('8px'), 'box-shadow': 'none' } },
  { component: 'Guestbook', part: 'ts-guestbook-button', what: 'its buttons', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'border-radius': 'var(--ts-radius, 6px)', 'font-family': FONT } },
  { component: 'Guestbook', part: 'ts-guestbook-entry', what: 'one message', declarations: box('8px') },
  { component: 'Guestbook', part: 'ts-guestbook-author', what: 'a message\'s author', declarations: { color: INK } },
  { component: 'Guestbook', part: 'ts-guestbook-message', what: 'a message\'s words', declarations: { color: INK } },

  // BlogPosts
  { component: 'BlogPosts', part: 'ts-posts-heading', what: 'its heading', declarations: heading },
  { component: 'BlogPosts', part: 'ts-post', what: 'one post', declarations: box('16px') },
  { component: 'BlogPosts', part: 'ts-post', what: 'a post under the pointer', state: ':hover', declarations: { 'box-shadow': SHADOW } },
  { component: 'BlogPosts', part: 'ts-post-title', what: 'a post\'s title', declarations: { color: INK, 'font-family': HEAD } },
  { component: 'BlogPosts', part: 'ts-post', what: 'its links (the title is one)', state: ' a', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post-author', what: 'who wrote it', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post-date', what: 'when', declarations: muted },
  { component: 'BlogPosts', part: 'ts-post-content', what: 'what it says', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post-actions', what: 'its small buttons', state: ' button', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW } },

  { component: 'BlogPosts', part: 'ts-post-footer', what: 'the line under a post', declarations: { 'border-top-color': EDGE } },
  { component: 'BlogPosts', part: 'ts-post-footer', what: 'the comments button under a post', state: ' button', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW } },

  // ProfilePhoto
  { component: 'ProfilePhoto', part: 'ts-photo-frame', what: 'the frame around the photo', declarations: { background: CARD, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW } },

  // ProfileHeader, DisplayName, Bio
  { component: 'DisplayName', part: 'ts-profile-display-name', what: 'the name', declarations: heading },
  { component: 'ProfileHeader', part: 'ts-profile-status', what: 'the small label under the name', declarations: { color: INK, 'font-family': FONT, opacity: '0.8' } },
  { component: 'ProfileHeader', part: 'ts-profile-bio', what: 'the bio', declarations: { color: INK } },
  { component: 'ProfileHeader', part: 'ts-profile-button', what: 'its buttons', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'font-family': FONT } },
  { component: 'Bio', part: 'ts-bio-heading', what: 'its heading', declarations: heading },
  { component: 'Bio', part: 'ts-bio-text', what: 'the bio', declarations: { color: INK } },

  // Form fields
  { component: 'TInput', part: 'ts-input', what: 'the text box', declarations: { ...box('4px'), 'box-shadow': 'none' } },
  { component: 'Select', part: 'ts-select', what: 'the menu', declarations: { ...box('6px'), 'box-shadow': 'none' } },
  { component: 'Checkbox', part: 'ts-checkbox-box', what: 'the box', declarations: { 'accent-color': 'var(--ts-accent, currentColor)' } },
  { component: 'Checkbox', part: 'ts-checkbox-label', what: 'its words', declarations: { color: INK, 'font-family': FONT } },
  { component: 'RadioGroup', part: 'ts-radio-dot', what: 'a choice\'s circle', declarations: { 'accent-color': 'var(--ts-accent, currentColor)' } },
  { component: 'RadioGroup', part: 'ts-radio-label', what: 'a choice\'s words', declarations: { color: INK, 'font-family': FONT } },
  { component: 'Slider', part: 'ts-slider-label', what: 'its label', declarations: { color: INK, 'font-family': FONT } },
  { component: 'Slider', part: 'ts-slider-value', what: 'the number it\'s at', declarations: { ...muted, 'font-family': FONT } },
  { component: 'Slider', part: 'ts-slider-track', what: 'the slider', declarations: { 'accent-color': 'var(--ts-accent, currentColor)', 'background-color': 'color-mix(in srgb, var(--ts-edge, currentColor) 25%, transparent)' } },
  { component: 'Slider', part: 'ts-slider-scale', what: 'the lowest and highest numbers', declarations: muted },
  { component: 'ColorPicker', part: 'ts-color-picker-label', what: 'its label', declarations: { color: INK, 'font-family': FONT } },
  { component: 'ColorPicker', part: 'ts-color-picker-swatch', what: 'the colour box', declarations: { 'border-color': EDGE } },
  { component: 'ColorPicker', part: 'ts-color-picker-value', what: 'the colour\'s code', declarations: { ...muted, 'font-family': FONT } },
];

const tokensIn = (value: string) => [...value.matchAll(/--ts-[\w-]+/g)].map((m) => m[0]);

/** A part's selector inside the page, weighing one class */
const selectorFor = (scope: string, part: Part) => `${scope} .${part.part}${part.state ?? ''}`;

/**
 * styles/component-parts.css: with site styles off, every part follows
 * the page, reading the tokens if the page set them. Unlayered and one
 * class heavy, so it beats the site's own classes (.thread-module) and
 * Tailwind's utilities, and any rule of the page's beats it.
 */
export function siteStylesOffCss(): string {
  const scope = ':where([data-template-root][data-site-styles="off"])';
  return PARTS.map((part) => {
    const body = Object.entries(part.declarations).map(([property, value]) => `  ${property}: ${value};`).join('\n');
    return `/* ${part.component}: ${part.what} */\n${selectorFor(scope, part)} {\n${body}\n}`;
  }).join('\n');
}

/** The whole of styles/component-parts.css */
export function componentPartsCssFile(): string {
  return `/*
 * Written by scripts/write-component-parts-css.ts from
 * lib/templates/styling/component-parts.ts: change that, then run the script.
 *
 * Your own HTML page with site styles off: our components follow the page.
 * Their boxes are see-through with an edge in the page's colour, their text
 * is the page's colour and font, unless the page sets a token (--ts-card,
 * --ts-ink…). Unlayered and one class heavy: it beats the site's own classes
 * and Tailwind's utilities, and any rule of the page's beats it.
 */
${siteStylesOffCss()}
`;
}

/** The tokens a page's CSS sets */
export function tokensSetIn(css: string): Set<string> {
  return new Set([...css.matchAll(/(--ts-[\w-]+)\s*:/g)].map((m) => m[1]).filter((name) => name in TOKENS));
}

/**
 * The declarations reading the tokens a page sets, for its CSS (site styles
 * on or off): `scope` is where the page's rules start, so these weigh what
 * the page's own rules on a part's class weigh, and come first so those win.
 */
export function tokenRulesFor(tokens: Set<string>, scope: string): string {
  if (tokens.size === 0) return '';
  return PARTS.flatMap((part) => {
    const declarations = Object.entries(part.declarations).filter(([, value]) => tokensIn(value).some((token) => tokens.has(token)));
    if (declarations.length === 0) return [];
    return [`${selectorFor(scope, part)} { ${declarations.map(([property, value]) => `${property}: ${value};`).join(' ')} }`];
  }).join('\n');
}
