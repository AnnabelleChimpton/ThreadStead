/**
 * Compiling and storing the widget slot (Profile.widgetSlot).
 *
 * The slot's fragment goes through THE compile pipeline
 * (compileTemplateToArtifacts) once, on save. The profile page only ever
 * reads the stored static HTML and islands, and renders them with the same
 * islands renderer as a whole custom page.
 */
import {
  compileTemplateToArtifacts,
  TemplateCompilationError,
  type StrippedComponentReport,
} from '@/lib/templates/compilation/compile-pipeline';
import type { Island } from '@/lib/templates/compilation/compiler/types';
import { parseTemplateError } from '@/lib/templates/errors/template-error-handler';
import { MAX_SLOT_SOURCE_CHARS, checkWidgets, widgetsToSource, type WidgetInstance } from './catalog';

/** What Profile.widgetSlot holds */
export interface StoredWidgetSlot {
  version: 1;
  /** The picks the fragment was written from; null once the code was edited by hand */
  widgets: WidgetInstance[] | null;
  source: string;
  staticHTML: string;
  islands: Island[];
  compiledAt: string;
}

/** What a visitor's page gets: the compiled slot, never its source */
export interface PublicWidgetSlot {
  staticHTML: string;
  islands: Island[];
  /** The profile song plays from the slot, so the page skips its own player */
  playsSong: boolean;
}

export type CompileSlotResult =
  | {
      ok: true;
      staticHTML: string;
      islands: Island[];
      strippedComponents: StrippedComponentReport[];
      warnings: string[];
    }
  | { ok: false; status: 400 | 413; error: string; details?: string };

// The slot gets the owner, the viewer, the bio, links, featured friends and
// the profile song, not the posts or pictures a whole page preloads. These
// would show an empty list as if there were nothing.
const NEEDS_PAGE_DATA: Record<string, string> = {
  blogposts: 'BlogPosts',
  mediagrid: 'MediaGrid',
  imagecarousel: 'ImageCarousel',
};

function pageDataComponent(islands: Island[]): string | null {
  for (const island of islands) {
    const name = NEEDS_PAGE_DATA[island.component.toLowerCase()];
    if (name) return name;
    const inner = pageDataComponent(island.children ?? []);
    if (inner) return inner;
  }
  return null;
}

export function slotSourceTooLong(source: string): string | null {
  if (source.length <= MAX_SLOT_SOURCE_CHARS) return null;
  return `The slot is over ${Math.round(MAX_SLOT_SOURCE_CHARS / 1000)} KB. Trim it and save again.`;
}

export function compileWidgetSlot(source: string): CompileSlotResult {
  const tooLong = slotSourceTooLong(source);
  if (tooLong) return { ok: false, status: 413, error: tooLong };
  if (!source.trim()) return { ok: false, status: 400, error: 'The slot is empty.' };

  try {
    const artifacts = compileTemplateToArtifacts(source);
    const needsPage = pageDataComponent(artifacts.islands);
    if (needsPage) {
      return {
        ok: false,
        status: 400,
        error: `<${needsPage}> doesn't work in the slot.`,
        details: 'It needs your posts or pictures, and those are on your tabs already.',
      };
    }
    return {
      ok: true,
      staticHTML: artifacts.staticHTML,
      islands: artifacts.islands,
      strippedComponents: artifacts.strippedComponents,
      warnings: artifacts.warnings,
    };
  } catch (error) {
    const first = error instanceof TemplateCompilationError ? error.errors[0] : (error as Error);
    const parsed = parseTemplateError(first ?? 'Template compilation failed');
    return { ok: false, status: 400, error: parsed.title, details: parsed.suggestion || parsed.message };
  }
}

export function islandsPlaySong(islands: Island[]): boolean {
  const walk = (list: Island[]): boolean =>
    list.some((i) => i.component.toLowerCase() === 'profilemusic' || walk(i.children ?? []));
  return walk(islands);
}

function isStoredSlot(value: unknown): value is StoredWidgetSlot {
  const v = value as Partial<StoredWidgetSlot> | null;
  return !!v && typeof v === 'object' && typeof v.staticHTML === 'string' && Array.isArray(v.islands);
}

/** The stored slot as the owner's picker reads it back */
export function storedSlot(value: unknown): StoredWidgetSlot | null {
  return isStoredSlot(value) ? value : null;
}

/** The stored slot as a profile page renders it, or null when there's nothing to show */
export function publicWidgetSlot(value: unknown): PublicWidgetSlot | null {
  if (!isStoredSlot(value) || !value.staticHTML.trim()) return null;
  return { staticHTML: value.staticHTML, islands: value.islands, playsSong: islandsPlaySong(value.islands) };
}

export type SlotInput =
  | { ok: true; widgets: WidgetInstance[] | null; source: string }
  | { ok: false; status: 400 | 413; error: string };

/**
 * A save or preview body: `widgets` from the picker's forms (the fragment is
 * written here, never trusted from the client), or `source` when the
 * resident edited the code by hand.
 */
export function slotInputFromBody(body: unknown): SlotInput {
  const { widgets, source } = (body ?? {}) as { widgets?: unknown; source?: unknown };
  if (typeof source === 'string') {
    const tooLong = slotSourceTooLong(source);
    if (tooLong) return { ok: false, status: 413, error: tooLong };
    return { ok: true, widgets: null, source: source.trim() };
  }
  const checked = checkWidgets(widgets);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  return { ok: true, widgets: checked.widgets, source: widgetsToSource(checked.widgets) };
}
