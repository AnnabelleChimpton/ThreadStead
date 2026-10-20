/**
 * The public component reference and the editor palette, made from the
 * registry. The registry is the one list of components: what each one is
 * called, which props it takes, what they do, and a snippet to copy. This
 * file only shapes it for reading; it holds no component facts of its own.
 *
 * Server-side only (it walks the registry, which imports every component).
 * Pages call it from getServerSideProps; the editor gets it through
 * /api/templates/component-schemas.
 */
import type { ComponentRegistration, ComponentGroup, PropSchema } from '@/lib/templates/core/template-registry-types';

export interface ComponentPropDoc {
  name: string;
  type: PropSchema['type'];
  required: boolean;
  values?: string[];
  default?: string;
  min?: number;
  max?: number;
  description?: string;
  /** A CSS value that becomes the component's inline style */
  css?: boolean;
}

export interface ComponentDoc {
  name: string;
  /** Anchor on the reference page: the lowercase name (tutorial links use it) */
  id: string;
  group: ComponentGroup;
  description?: string;
  /** A snippet to copy: the registry's example, or one made from the required props */
  example: string;
  acceptsChildren: boolean;
  /** The component this one goes inside (Tab in Tabs) */
  parent?: string;
  props: ComponentPropDoc[];
}

export interface ComponentGroupInfo {
  id: ComponentGroup;
  title: string;
  blurb: string;
}

/** Reference order: the things only this site has come first. */
export const COMPONENT_GROUPS: readonly ComponentGroupInfo[] = [
  {
    id: 'connected',
    title: 'Connected to your page',
    blurb: 'Your own things from here: your guestbook, posts, friends, rings and song. They update by themselves.',
  },
  { id: 'profile', title: 'Your profile', blurb: 'Your picture, name and bio, wherever you want them.' },
  { id: 'layout', title: 'Layout and text', blurb: 'Rows, grids, boxes and tabs for arranging a page. Plain HTML and CSS work too.' },
  { id: 'decorative', title: 'Decorations', blurb: 'Sticky notes, neon signs, tapes and other things to look at.' },
  {
    id: 'interactive',
    title: 'Things visitors can use',
    blurb: 'Page variables and form fields, for the small jobs a script would do on another site. Scripts don’t run here.',
  },
  { id: 'logic', title: 'Logic and events', blurb: 'Show things only sometimes, react to clicks, work with lists.' },
  { id: 'site', title: 'Parts of the site', blurb: 'Pieces of the site itself, like the notification bell.' },
];

/** Within "connected", the ones people reach for first. The rest follow in registry order. */
const CONNECTED_FIRST = ['Guestbook', 'FollowButton', 'BlogPosts', 'FriendDisplay', 'ProfileMusic', 'MediaGrid'];

function exampleValue(schema: PropSchema): string {
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return String(schema.default);
  if (schema.type === 'enum' && schema.values?.length) return schema.values[0];
  if (schema.type === 'boolean') return 'true';
  if (schema.type === 'number') return String(schema.min ?? 1);
  return '';
}

/** The registry's example, or the component with its required props filled in. */
export function componentExample(registration: ComponentRegistration): string {
  if (registration.example) return registration.example;
  const required = Object.entries(registration.props)
    .filter(([, schema]) => schema.required)
    .map(([name, schema]) => ` ${name}="${exampleValue(schema)}"`)
    .join('');
  return acceptsChildren(registration)
    ? `<${registration.name}${required}>\n  \n</${registration.name}>`
    : `<${registration.name}${required} />`;
}

/**
 * Whether it wraps content. From relationship metadata, or, without any,
 * from its own example (IfOwner, Choose and When have no metadata).
 */
export function acceptsChildren(registration: ComponentRegistration): boolean {
  if (registration.relationship) return registration.relationship.acceptsChildren !== false;
  return !!registration.example?.includes(`</${registration.name}>`);
}

function propDocs(props: Record<string, PropSchema>): ComponentPropDoc[] {
  return Object.entries(props).map(([name, schema]) => ({
    name,
    type: schema.type,
    required: !!schema.required,
    ...(schema.type === 'enum' && schema.values ? { values: [...schema.values] } : {}),
    ...(schema.type === 'boolean' ? { values: ['true', 'false'] } : {}),
    ...(schema.default !== undefined && schema.default !== '' ? { default: String(schema.default) } : {}),
    ...(schema.min !== undefined ? { min: schema.min } : {}),
    ...(schema.max !== undefined ? { max: schema.max } : {}),
    ...(schema.description ? { description: schema.description } : {}),
    ...(schema.css ? { css: true } : {}),
  }));
}

/** One component, as the reference and the palette show it. */
export function componentDoc(registration: ComponentRegistration): ComponentDoc {
  return {
    name: registration.name,
    id: registration.name.toLowerCase(),
    group: registration.group ?? 'logic',
    ...(registration.description ? { description: registration.description } : {}),
    example: componentExample(registration),
    acceptsChildren: acceptsChildren(registration),
    ...(registration.relationship?.requiresParent ? { parent: registration.relationship.requiresParent } : {}),
    props: propDocs(registration.props),
  };
}

/** Every registered component, in reference order: by group, connected ones first. */
export function buildComponentDocs(registrations: Map<string, ComponentRegistration>): ComponentDoc[] {
  const docs = Array.from(registrations.values()).map(componentDoc);
  const groupOrder = new Map(COMPONENT_GROUPS.map((group, index) => [group.id, index]));
  const position = (doc: ComponentDoc) => {
    const featured = CONNECTED_FIRST.indexOf(doc.name);
    return featured === -1 ? CONNECTED_FIRST.length : featured;
  };
  // Array.prototype.sort is stable, so registry order holds within a group
  return docs.sort(
    (a, b) => (groupOrder.get(a.group) ?? 99) - (groupOrder.get(b.group) ?? 99) || position(a) - position(b)
  );
}
