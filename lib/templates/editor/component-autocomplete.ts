// Client-side helpers that turn /api/templates/component-schemas into
// CodeMirror HTML completions and palette snippets. Deliberately does NOT
// import the component registry — that would pull all component
// implementations into the editor bundle.
import type { TagSpec } from '@codemirror/lang-html';

export interface ComponentSchemaProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  values?: string[];
  default?: string;
}

export interface ComponentSchema {
  name: string;
  acceptsChildren: boolean;
  props: ComponentSchemaProp[];
}

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

/** What the palette inserts: containers open+close, leaves self-close. */
export function componentSnippet(c: ComponentSchema): string {
  const required = c.props
    .filter((p) => p.required)
    .map((p) => ` ${p.name}="${p.default ?? ''}"`)
    .join('');
  return c.acceptsChildren
    ? `<${c.name}${required}>\n  \n</${c.name}>`
    : `<${c.name}${required} />`;
}

/** One-line human summary of a component's props, for palette tooltips. */
export function describeProps(c: ComponentSchema): string {
  if (c.props.length === 0) return 'No props';
  return c.props
    .map((p) => `${p.name}${p.required ? '*' : ''}: ${p.values ? p.values.join(' | ') : p.type}`)
    .join('\n');
}
