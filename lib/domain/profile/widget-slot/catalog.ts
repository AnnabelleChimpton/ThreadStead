/**
 * The widget slot's catalog: the few widgets someone can put under their
 * profile header without switching to their own HTML layout.
 *
 * Each widget is a short form (text, a colour, an image link) and a function
 * that writes the template fragment for it. The fragment is ordinary template
 * source, so it goes through the same compile pipeline and sanitizer as a
 * whole page (lib/domain/profile/widget-slot/compile.ts); the values are
 * escaped here as well, so nobody's text turns into tags.
 *
 * Shared by the picker (client) and the save API (server): no server imports.
 */
import type { PixelIconName } from '@/components/ui/PixelIcon';

export const WIDGET_TYPES = [
  'sticky',
  'polaroid',
  'buttons',
  'rings',
  'music',
  'guestbook',
  'now',
  'marquee',
  'secret',
  'textbox',
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

/** How many widgets fit in the slot at once */
export const MAX_WIDGETS = 4;
/** The slot's whole fragment, hand-edited or generated */
export const MAX_SLOT_SOURCE_CHARS = 12_000;

export interface LinkedImage {
  image: string;
  link: string;
}
export type WidgetValue = string | LinkedImage[];
export type WidgetValues = Record<string, WidgetValue>;

export interface WidgetInstance {
  type: WidgetType;
  values: WidgetValues;
}

interface FieldBase {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
}
export type WidgetField =
  | (FieldBase & { type: 'text' | 'textarea'; maxLength: number; required?: boolean })
  /** picture: a "Choose a picture" button opens your own images (WidgetSlotPicker) */
  | (FieldBase & { type: 'url'; required?: boolean; picture?: boolean })
  | (FieldBase & { type: 'choice'; options: ReadonlyArray<{ value: string; label: string }> })
  | (FieldBase & { type: 'images'; maxItems: number });

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  blurb: string;
  icon: PixelIconName;
  fields: WidgetField[];
  defaults: WidgetValues;
  /** Values for the picker's gallery preview, when the defaults show nothing */
  sample?: WidgetValues;
  /** Only makes sense once the resident has picked a profile song */
  needsSong?: boolean;
  fragment: (values: WidgetValues) => string;
}

/* ---------------- escaping ---------------- */

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Paragraphs from blank lines, line breaks from single newlines */
function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeText(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function isWebUrl(s: string): boolean {
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

const str = (v: WidgetValue | undefined): string => (typeof v === 'string' ? v : '');
const images = (v: WidgetValue | undefined): LinkedImage[] => (Array.isArray(v) ? v : []);

/* ---------------- choices ---------------- */

const TILT = [
  { value: '0', label: 'Straight' },
  { value: '-3', label: 'Tilted left' },
  { value: '3', label: 'Tilted right' },
] as const;

// StickyNote's own colour prop can't be set from a template yet (its registry
// name and component name differ), so the colour goes in as a background.
const NOTE_COLOURS: Record<string, { label: string; paper: string; edge: string }> = {
  yellow: { label: 'Yellow', paper: '#fef08a', edge: '#fde047' },
  pink: { label: 'Pink', paper: '#fbcfe8', edge: '#f9a8d4' },
  blue: { label: 'Blue', paper: '#bfdbfe', edge: '#93c5fd' },
  green: { label: 'Green', paper: '#bbf7d0', edge: '#86efac' },
  orange: { label: 'Orange', paper: '#fed7aa', edge: '#fdba74' },
  purple: { label: 'Purple', paper: '#e9d5ff', edge: '#d8b4fe' },
};

const MARQUEE_SPEED: Record<string, string> = { slow: '3', normal: '6', fast: '12' };

function tilt(v: WidgetValue | undefined): string {
  const t = str(v);
  return TILT.some((o) => o.value === t) ? t : '0';
}

// An empty 88×31 outline for the gallery preview, so it isn't anyone's button
const SAMPLE_BUTTON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="31"><rect x="0.5" y="0.5" width="87" height="30" fill="#f5efe0" stroke="#7a6a55" stroke-dasharray="3 2"/><text x="44" y="20" font-family="monospace" font-size="10" text-anchor="middle" fill="#7a6a55">88×31</text></svg>'
  );

// A drawn hill and sun for the gallery's polaroid, so it isn't anyone's photo
const SAMPLE_PICTURE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#cfe3ef"/><circle cx="118" cy="34" r="14" fill="#f6d36b"/><path d="M0 92 Q50 58 96 84 T160 78 V120 H0 Z" fill="#9cc58a"/></svg>'
  );

/* ---------------- the widgets ---------------- */

export const WIDGETS: Record<WidgetType, WidgetDefinition> = {
  sticky: {
    type: 'sticky',
    name: 'Sticky note',
    blurb: 'A short note in handwriting.',
    icon: 'edit',
    fields: [
      { key: 'text', label: 'Note', type: 'textarea', maxLength: 160, required: true },
      {
        key: 'colour',
        label: 'Colour',
        type: 'choice',
        options: Object.entries(NOTE_COLOURS).map(([value, c]) => ({ value, label: c.label })),
      },
      { key: 'tilt', label: 'Tilt', type: 'choice', options: TILT },
    ],
    defaults: { text: 'Hi! Thanks for stopping by.', colour: 'yellow', tilt: '-3' },
    fragment: (v) => {
      const c = NOTE_COLOURS[str(v.colour)] ?? NOTE_COLOURS.yellow;
      // The ink colour sits on the inner div: a `color` on StickyNote itself
      // is read as its (unusable) note-colour prop and defaults to yellow text.
      return (
        `<StickyNote rotation="${tilt(v.tilt)}" style="background-color: ${c.paper}; border-color: ${c.edge}">` +
        `<div style="color: #3b2f1e">${paragraphs(str(v.text))}</div></StickyNote>`
      );
    },
  },

  polaroid: {
    type: 'polaroid',
    name: 'Polaroid',
    blurb: 'One picture with a caption under it.',
    icon: 'camera',
    fields: [
      {
        key: 'image',
        label: 'Picture',
        type: 'url',
        picture: true,
        required: true,
        placeholder: 'https://…',
        hint: 'Choose one of your pictures, or paste any https:// image link.',
      },
      { key: 'caption', label: 'Caption', type: 'text', maxLength: 60 },
      { key: 'tilt', label: 'Tilt', type: 'choice', options: TILT },
    ],
    defaults: { image: '', caption: '', tilt: '3' },
    sample: { image: SAMPLE_PICTURE, caption: 'Your caption', tilt: '3' },
    fragment: (v) =>
      `<PolaroidFrame caption="${escapeAttr(str(v.caption))}" rotation="${tilt(v.tilt)}">` +
      `<img src="${escapeAttr(str(v.image))}" alt="${escapeAttr(str(v.caption))}"></PolaroidFrame>`,
  },

  buttons: {
    type: 'buttons',
    name: '88×31 buttons',
    blurb: 'A wall of little buttons, each one a link if you like.',
    icon: 'link',
    fields: [{ key: 'buttons', label: 'Buttons', type: 'images', maxItems: 12 }],
    defaults: { buttons: [] },
    sample: { buttons: [SAMPLE_BUTTON, SAMPLE_BUTTON, SAMPLE_BUTTON].map((image) => ({ image, link: '' })) },
    fragment: (v) => {
      const items = images(v.buttons)
        .map(({ image, link }) => {
          const img = `<img src="${escapeAttr(image)}" width="88" height="31" alt="">`;
          return link ? `<a href="${escapeAttr(link)}" target="_blank">${img}</a>` : img;
        })
        .join('');
      return `<div class="ts-widget-buttons">${items}</div>`;
    },
  },

  rings: {
    type: 'rings',
    name: 'Ring badges',
    blurb: 'The badges of the rings you belong to.',
    icon: 'trophy',
    fields: [],
    defaults: {},
    fragment: () => '<ProfileBadges layout="grid" />',
  },

  music: {
    type: 'music',
    name: 'My song',
    blurb: 'Your profile song, with a play button in the page.',
    icon: 'music',
    fields: [],
    defaults: {},
    needsSong: true,
    fragment: () => '<ProfileMusic />',
  },

  guestbook: {
    type: 'guestbook',
    name: 'Sign my guestbook',
    blurb: 'A nudge towards your guestbook.',
    icon: 'chat',
    fields: [
      { key: 'line', label: 'A line above it', type: 'text', maxLength: 80 },
      { key: 'label', label: 'Link text', type: 'text', maxLength: 40, required: true },
    ],
    defaults: { line: 'Say hi before you go?', label: 'Sign my guestbook' },
    fragment: (v) => {
      const line = str(v.line).trim();
      return (
        `<div class="ts-widget-guestbook">` +
        (line ? `<p>${escapeText(line)}</p>` : '') +
        `<p><a class="thread-button" href="?tab=guestbook">${escapeText(str(v.label))}</a></p></div>`
      );
    },
  },

  now: {
    type: 'now',
    name: 'Right now',
    blurb: 'What you are listening to, reading and up to.',
    icon: 'clock',
    fields: [
      { key: 'listening', label: 'Listening to', type: 'text', maxLength: 80 },
      { key: 'reading', label: 'Reading', type: 'text', maxLength: 80 },
      { key: 'doing', label: 'Up to', type: 'text', maxLength: 80 },
    ],
    defaults: { listening: '', reading: '', doing: '' },
    sample: { listening: 'a song', reading: 'a book', doing: 'something nice' },
    fragment: (v) => {
      const rows = [
        ['Listening to', str(v.listening)],
        ['Reading', str(v.reading)],
        ['Up to', str(v.doing)],
      ]
        .filter(([, value]) => value.trim())
        .map(([label, value]) => `<li><strong>${label}:</strong> ${escapeText(value.trim())}</li>`)
        .join('');
      return `<div class="ts-widget-now"><h3 class="thread-headline">Right now</h3><ul>${rows}</ul></div>`;
    },
  },

  marquee: {
    type: 'marquee',
    name: 'Scrolling text',
    blurb: 'A line of text that slides across, the old-fashioned way.',
    icon: 'arrow-left',
    fields: [
      { key: 'text', label: 'Text', type: 'text', maxLength: 120, required: true },
      {
        key: 'direction',
        label: 'Direction',
        type: 'choice',
        options: [
          { value: 'left', label: 'Right to left' },
          { value: 'right', label: 'Left to right' },
        ],
      },
      {
        key: 'speed',
        label: 'Speed',
        type: 'choice',
        options: [
          { value: 'slow', label: 'Slow' },
          { value: 'normal', label: 'Normal' },
          { value: 'fast', label: 'Fast' },
        ],
      },
    ],
    defaults: { text: 'welcome to my corner of the web', direction: 'left', speed: 'normal' },
    fragment: (v) => {
      const direction = str(v.direction) === 'right' ? 'right' : 'left';
      const speed = MARQUEE_SPEED[str(v.speed)] ?? MARQUEE_SPEED.normal;
      return `<marquee class="ts-widget-marquee" direction="${direction}" scrollamount="${speed}">${escapeText(str(v.text))}</marquee>`;
    },
  },

  secret: {
    type: 'secret',
    name: 'Secret note',
    blurb: 'A note that only shows when someone clicks.',
    icon: 'eye-closed',
    fields: [
      { key: 'button', label: 'Button text', type: 'text', maxLength: 40, required: true },
      { key: 'text', label: 'The hidden note', type: 'textarea', maxLength: 400, required: true },
    ],
    defaults: { button: 'Psst, click me', text: 'You found it.' },
    fragment: (v) =>
      `<RevealBox buttonText="${escapeAttr(str(v.button))}" revealText="Hide it again">${paragraphs(str(v.text))}</RevealBox>`,
  },

  textbox: {
    type: 'textbox',
    name: 'Text box',
    blurb: 'A heading and a few lines of your own.',
    icon: 'article',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', maxLength: 60 },
      { key: 'text', label: 'Text', type: 'textarea', maxLength: 800, required: true },
    ],
    defaults: { heading: 'About this page', text: '' },
    sample: { heading: 'About this page', text: 'A few lines of your own.' },
    fragment: (v) => {
      const heading = str(v.heading).trim();
      return (
        `<div class="ts-widget-textbox">` +
        (heading ? `<h3 class="thread-headline">${escapeText(heading)}</h3>` : '') +
        `${paragraphs(str(v.text))}</div>`
      );
    },
  },
};

export const WIDGET_LIST: WidgetDefinition[] = WIDGET_TYPES.map((t) => WIDGETS[t]);

/** A fresh widget with its default values */
export function newWidget(type: WidgetType): WidgetInstance {
  return { type, values: structuredCloneValues(WIDGETS[type].defaults) };
}

function structuredCloneValues(values: WidgetValues): WidgetValues {
  const out: WidgetValues = {};
  for (const [k, v] of Object.entries(values)) out[k] = Array.isArray(v) ? v.map((i) => ({ ...i })) : v;
  return out;
}

/** The widget as the gallery shows it */
export function sampleWidget(type: WidgetType): WidgetInstance {
  const def = WIDGETS[type];
  return { type, values: structuredCloneValues(def.sample ?? def.defaults) };
}

/* ---------------- validation ---------------- */

export type CheckResult = { ok: true; widgets: WidgetInstance[] } | { ok: false; error: string };

/**
 * Checks widgets sent by the picker and keeps only known fields. The error is
 * the one message the resident sees, naming the widget and field.
 */
export function checkWidgets(input: unknown): CheckResult {
  if (!Array.isArray(input)) return { ok: false, error: 'Pick at least one widget.' };
  if (input.length > MAX_WIDGETS) return { ok: false, error: `The slot holds up to ${MAX_WIDGETS} widgets.` };

  const widgets: WidgetInstance[] = [];
  for (const raw of input) {
    const type = (raw as { type?: unknown })?.type;
    if (typeof type !== 'string' || !(WIDGET_TYPES as readonly string[]).includes(type)) {
      return { ok: false, error: 'That widget isn’t one we have.' };
    }
    const def = WIDGETS[type as WidgetType];
    const rawValues = ((raw as { values?: unknown }).values ?? {}) as Record<string, unknown>;
    const values: WidgetValues = {};

    for (const field of def.fields) {
      const value = rawValues[field.key];
      const where = `${def.name}, ${field.label.toLowerCase()}`;

      if (field.type === 'images') {
        const list = Array.isArray(value) ? value : [];
        if (list.length > field.maxItems) {
          return { ok: false, error: `${def.name}: up to ${field.maxItems}.` };
        }
        const items: LinkedImage[] = [];
        for (const item of list) {
          const image = typeof item?.image === 'string' ? item.image.trim() : '';
          const link = typeof item?.link === 'string' ? item.link.trim() : '';
          if (!image && !link) continue;
          if (!isWebUrl(image)) return { ok: false, error: `${def.name}: each picture needs a link starting with https://` };
          if (link && !isWebUrl(link)) return { ok: false, error: `${def.name}: links need to start with https://` };
          items.push({ image, link });
        }
        if (items.length === 0) return { ok: false, error: `${def.name}: add at least one button.` };
        values[field.key] = items;
        continue;
      }

      const text = typeof value === 'string' ? value.trim() : '';
      if (field.type === 'choice') {
        values[field.key] = field.options.some((o) => o.value === text) ? text : field.options[0].value;
        continue;
      }
      if (field.type === 'url') {
        if (!text && !field.required) {
          values[field.key] = '';
          continue;
        }
        if (!isWebUrl(text)) return { ok: false, error: `${where}: use a link starting with https://` };
        values[field.key] = text;
        continue;
      }
      if (text.length > field.maxLength) {
        return { ok: false, error: `${where}: keep it under ${field.maxLength} characters.` };
      }
      if (field.required && !text) return { ok: false, error: `${where}: this one can’t be empty.` };
      values[field.key] = text;
    }

    if (type === 'now' && !['listening', 'reading', 'doing'].some((k) => str(values[k]))) {
      return { ok: false, error: 'Right now: fill in at least one line.' };
    }
    widgets.push({ type: type as WidgetType, values });
  }
  if (widgets.length === 0) return { ok: false, error: 'Pick at least one widget.' };
  return { ok: true, widgets };
}

/* ---------------- the fragment ---------------- */

/** The template source for a list of (checked) widgets */
export function widgetsToSource(widgets: WidgetInstance[]): string {
  return widgets
    .map((w) => `<div class="ts-widget ts-widget--${w.type}">\n  ${WIDGETS[w.type].fragment(w.values)}\n</div>`)
    .join('\n');
}

/** The profile-song widget is in this fragment */
export function sourcePlaysSong(source: string): boolean {
  return /<ProfileMusic\b/.test(source);
}
