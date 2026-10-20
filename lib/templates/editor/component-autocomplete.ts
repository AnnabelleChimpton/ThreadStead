// Client-side helpers that turn /api/templates/component-schemas into
// CodeMirror HTML completions and palette snippets. Deliberately does NOT
// import the component registry — that would pull all component
// implementations into the editor bundle.
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
    specs[c.name] = { attrs, globalAttrs: true };
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
