/**
 * Settings → Your page: themes and the few knobs on top of them.
 *
 * A theme is one of the five presets (lib/templates/{abstract-art,…}.ts).
 * Each declares its colours and fonts as --ts-* variables in one :root block,
 * so a knob is a single variable. The knobs live in a marked block at the end
 * of the person's CSS, rewritten whole on each save, so their own CSS above it
 * is never touched. `html:root` outranks the preset's `:root` in every mode
 * (in standard-layout mode both are scoped, and specificity decides first).
 */
import { PRESET_FONT_FACES } from './preset-fonts';
import {
  DEFAULT_PROFILE_TEMPLATE_INFO,
  getDefaultProfileTemplate,
  type ProfileTemplateType,
} from './default-profile-templates';

export const THEME_IDS: ProfileTemplateType[] = ['classic-linen', 'abstract-art', 'charcoal-nights', 'pixel-petals', 'retro-social'];

export interface ThemeVars {
  ground: string;
  card: string;
  ink: string;
  accent: string;
  onAccent: string;
  fontHead: string;
  fontBody: string;
}

export interface Theme {
  id: ProfileTemplateType;
  name: string;
  description: string;
  vars: ThemeVars;
}

const VAR_NAMES: Record<keyof ThemeVars, string> = {
  ground: '--ts-ground',
  card: '--ts-card',
  ink: '--ts-ink',
  accent: '--ts-accent',
  onAccent: '--ts-on-accent',
  fontHead: '--ts-font-head',
  fontBody: '--ts-font-body',
};

/** The theme variables a stylesheet's first :root block declares, or null if it has none. */
export function readThemeVars(css: string): ThemeVars | null {
  const root = css.match(/(?:^|[\s}]):root\s*\{([^}]*)\}/);
  if (!root) return null;
  const vars: Partial<ThemeVars> = {};
  for (const [key, name] of Object.entries(VAR_NAMES) as [keyof ThemeVars, string][]) {
    const m = root[1].match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
    if (m) vars[key] = m[1].trim();
  }
  return vars.ground && vars.ink && vars.accent && vars.fontHead && vars.fontBody ? (vars as ThemeVars) : null;
}

export const THEMES: Theme[] = THEME_IDS.map((id) => ({
  id,
  name: DEFAULT_PROFILE_TEMPLATE_INFO[id].name,
  description: DEFAULT_PROFILE_TEMPLATE_INFO[id].description,
  vars: readThemeVars(getDefaultProfileTemplate(id))!,
}));

/** Which theme a saved stylesheet started from, by the name in its header comment. */
export function detectTheme(css: string | null | undefined): ProfileTemplateType | null {
  if (!css) return null;
  return (
    THEMES.find((t) => new RegExp(`/\\*[\\s=-]*${t.name.toUpperCase()}\\b`).test(css))?.id ?? null
  );
}

export interface FontChoice {
  label: string;
  stack: string;
  /** A self-hosted family whose @font-face rules the settings block must carry */
  family?: string;
}

export const FONT_CHOICES: FontChoice[] = [
  { label: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", family: 'Source Serif 4' },
  { label: 'Fraunces', stack: "'Fraunces', Georgia, serif", family: 'Fraunces' },
  { label: 'Archivo', stack: "'Archivo', sans-serif", family: 'Archivo' },
  { label: 'Inter', stack: "'Inter', system-ui, sans-serif", family: 'Inter' },
  { label: 'Nunito', stack: "'Nunito', sans-serif", family: 'Nunito' },
  { label: 'Righteous', stack: "'Righteous', Verdana, sans-serif", family: 'Righteous' },
  { label: 'Silkscreen (pixel)', stack: "'Silkscreen', monospace", family: 'Silkscreen' },
  { label: 'Space Mono', stack: "'Space Mono', monospace", family: 'Space Mono' },
  { label: 'Georgia', stack: 'Georgia, serif' },
  { label: 'Verdana', stack: 'Verdana, Tahoma, sans-serif' },
  { label: 'Courier', stack: "'Courier New', Courier, monospace" },
];

export interface Knobs {
  accent?: string;
  ground?: string;
  /** An https: image URL for the page background */
  groundImage?: string;
  fontHead?: string;
  fontBody?: string;
}

const BLOCK_START = '/* ---- Settings > Your page (rewritten when you save there) ---- */';
const BLOCK_END = '/* ---- end of Settings > Your page ---- */';
const HEX = /^#[0-9a-f]{6}$/i;

function cssString(value: string): string {
  return `"${value.replace(/["\\\n\r]/g, '')}"`;
}

/** A background image URL the block may use: https only, no quotes or parens. */
export function safeImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!/^https:\/\/[^\s"'()\\<>]+$/i.test(trimmed)) return null;
  return trimmed;
}

/** The stylesheet without its Your page block. */
export function stripKnobs(css: string): string {
  const start = css.indexOf(BLOCK_START);
  if (start < 0) return css;
  const end = css.indexOf(BLOCK_END, start);
  const after = end < 0 ? '' : css.slice(end + BLOCK_END.length);
  return (css.slice(0, start) + after).replace(/\s+$/, '') + '\n';
}

/** The knobs a stylesheet's Your page block sets (empty when there's none). */
export function readKnobs(css: string): Knobs {
  const start = css.indexOf(BLOCK_START);
  if (start < 0) return {};
  const block = css.slice(start, css.indexOf(BLOCK_END, start) + 1 || undefined);
  const get = (name: string) => block.match(new RegExp(`${name}\\s*:\\s*([^;!]+)`))?.[1].trim();
  const image = block.match(/background-image:\s*url\("([^"]+)"\)/)?.[1];
  const knobs: Knobs = {};
  const accent = get('--ts-accent');
  const ground = get('--ts-ground');
  const fontHead = get('--ts-font-head');
  const fontBody = get('--ts-font-body');
  if (accent) knobs.accent = accent;
  if (ground) knobs.ground = ground;
  if (fontHead) knobs.fontHead = fontHead;
  if (fontBody) knobs.fontBody = fontBody;
  if (image) knobs.groundImage = image;
  return knobs;
}

/** Only the CSS for the knobs (the block itself), or '' when nothing is set. */
export function knobsBlock(knobs: Knobs): string {
  const vars: string[] = [];
  if (knobs.accent && HEX.test(knobs.accent)) vars.push(`  --ts-accent: ${knobs.accent};`);
  if (knobs.ground && HEX.test(knobs.ground)) vars.push(`  --ts-ground: ${knobs.ground};`);
  const fonts = [knobs.fontHead, knobs.fontBody]
    .map((stack) => FONT_CHOICES.find((f) => f.stack === stack))
    .filter((f): f is FontChoice => !!f);
  if (knobs.fontHead && fonts.some((f) => f.stack === knobs.fontHead)) vars.push(`  --ts-font-head: ${knobs.fontHead};`);
  if (knobs.fontBody && fonts.some((f) => f.stack === knobs.fontBody)) vars.push(`  --ts-font-body: ${knobs.fontBody};`);
  const image = safeImageUrl(knobs.groundImage);
  if (vars.length === 0 && !image) return '';

  const families = [...new Set(fonts.map((f) => f.family).filter((f): f is string => !!f))];
  const parts = [BLOCK_START];
  for (const family of families) parts.push(PRESET_FONT_FACES[family]);
  if (vars.length) parts.push(`html:root {\n${vars.join('\n')}\n}`);
  if (image) {
    parts.push(
      `.thread-surface {\n  background-image: url(${cssString(image)}) !important;\n  background-size: cover !important;\n  background-attachment: fixed !important;\n}`
    );
  }
  parts.push(BLOCK_END);
  return parts.join('\n');
}

/** The stylesheet with its Your page block replaced by these knobs. */
export function writeKnobs(css: string, knobs: Knobs): string {
  const base = stripKnobs(css || '');
  const block = knobsBlock(knobs);
  return block ? `${base.replace(/\s+$/, '')}\n\n${block}\n` : base;
}
