// Client-side helpers that turn /api/templates/component-schemas into
// CodeMirror HTML completions and palette snippets. Deliberately does NOT
// import the component registry — that would pull all component
// implementations into the editor bundle.
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { COMPONENT_NICKNAMES } from './component-nicknames';
import { HTML_AUTHORING_TAGS } from '@/lib/templates/compilation/html-allowlist';
import type { TagSpec } from '@codemirror/lang-html';

import type { ComponentDoc, ComponentPropDoc } from '@/lib/templates-docs/component-docs';

// The registry's own docs (lib/templates-docs/component-docs.ts), as the API sends them
export type ComponentSchemaProp = ComponentPropDoc;
export type ComponentSchema = ComponentDoc;

let cachedSchemas: ComponentSchema[] | null = null;
let inflight: Promise<ComponentSchema[]> | null = null;

export async function fetchComponentSchemas(): Promise<ComponentSchema[]> {
  if (cachedSchemas) return cachedSchemas;
  if (!inflight) {
    inflight = fetch('/api/templates/component-schemas')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load component schemas');
        const data = await res.json();
        cachedSchemas = data.components as ComponentSchema[];
        return cachedSchemas;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** CodeMirror lang-html `extraTags` config: tag + attribute completion. */
export function buildExtraTags(components: ComponentSchema[]): Record<string, TagSpec> {
  const specs: Record<string, TagSpec> = {};
  for (const c of components) {
    const attrs: Record<string, null | readonly string[]> = {};
    for (const p of c.props) {
      attrs[p.name] = p.values ?? null;
    }
    // look="plain", on any component with a box (lib/templates/styling/component-parts.ts)
    if (c.plain) attrs.look = ['plain'];
    // Only the component's own settings: HTML's global and aria-* attributes
    // buried them in the list
    specs[c.name] = { attrs, globalAttrs: false };
  }
  return specs;
}

/** What the palette inserts: the registry's snippet, the same one the component reference shows. */
export function componentSnippet(c: ComponentSchema): string {
  return c.example;
}

/** What a component does and the settings it takes, for palette tooltips. */
export function describeProps(c: ComponentSchema): string {
  const settings = c.props
    .map((p) => `${p.name}${p.required ? ' (needed)' : ''}: ${p.values ? p.values.join(' | ') : p.type}`)
    .join('\n');
  return [c.description, c.parent ? `Goes inside <${c.parent}>.` : '', settings || 'No settings.']
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Components by what people might call them ("iframe" → Embed), offered
 * only when no real tag or component starts with what's typed: <If and
 * Enter gave <Embed (for iframe), <sec gave <RevealBox (bug bash
 * 2026-10-26). `componentNames`: the page's components (the API's schemas).
 */
export function nicknameCompletionsFor(componentNames: readonly string[]) {
  const real = [...HTML_AUTHORING_TAGS, ...componentNames].map((name) => name.toLowerCase());
  return (context: CompletionContext): CompletionResult | null => {
    const typed = context.matchBefore(/<[A-Za-z][\w-]*$/);
    if (!typed || typed.text.length < 3) return null;
    const word = typed.text.slice(1).toLowerCase().replace(/[-_]/g, '');
    if (real.some((name) => name.startsWith(typed.text.slice(1).toLowerCase()))) return null;
    const seen = new Set<string>();
    const options = Object.entries(COMPONENT_NICKNAMES)
      .filter(([nickname, component]) => nickname.startsWith(word) && !component.toLowerCase().startsWith(word))
      .filter(([, component]) => !seen.has(component) && !!seen.add(component))
      .map(([nickname, component]) => ({ label: component, detail: `for ${nickname}`, type: 'type', boost: 20 }));
    return options.length ? { from: typed.from + 1, options, filter: false } : null;
  };
}

/** Nicknames with only HTML's own tags counted as real (before the component list loads) */
export const nicknameCompletions = nicknameCompletionsFor([]);
