/**
 * The tree a page of your own HTML is rendered from (see IslandPage.tsx).
 *
 * Elements carry their attributes exactly as the browser would read them out
 * of the compiled staticHTML: attribute names in their HTML/SVG spelling,
 * string values, in source order. That keeps one renderer for every source:
 *  - the stored compile AST (hast), converted on the server (treeFromHast);
 *  - compiled staticHTML, parsed on the server for rows saved before the AST
 *    was stored, or by the browser where only HTML is at hand (editor
 *    preview, widget slot: treeFromDom).
 */
import { find, html as htmlSpace, svg as svgSpace } from 'property-information';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import { postsToApi } from '@/lib/templates/compilation/form-action';

export type PageTreeNode = string | PageTreeElement;

export interface PageTreeElement {
  /** Tag name as the DOM reports localName (SVG keeps its casing) */
  t: string;
  /** Attributes as [name, value] pairs */
  a?: Array<[string, string]>;
  c?: PageTreeNode[];
  /** Its children as HTML, in place of `c`: nothing in them is a component (page-html.ts) */
  h?: string;
  /** In the SVG namespace */
  svg?: 1;
}

/** Island placeholders the compiler leaves in the tree */
export function islandIdOf(el: PageTreeElement): string | null {
  const id = el.a?.find(([name]) => name === 'data-island')?.[1];
  const component = el.a?.find(([name]) => name === 'data-component')?.[1];
  return id && component ? id : null;
}

/**
 * Whether a compiled page has its own <main> (or role="main"): then the
 * frame around it doesn't add one (AdvancedNavFrame). Reads a page tree, or
 * a stored compile AST.
 */
export function pageHasMain(compiled: unknown): boolean {
  const page = compiled as { tree?: unknown[]; ast?: { children?: unknown[] }; hasMain?: boolean } | null | undefined;
  // Worked out before parts of the page became HTML (page-html.ts)
  if (typeof page?.hasMain === 'boolean') return page.hasMain;
  type Node = { t?: string; a?: Array<[string, string]>; c?: Node[]; tagName?: string; properties?: Record<string, unknown>; children?: Node[] };
  const isMain = (node: Node) =>
    node.t === 'main' || node.tagName === 'main' ||
    (node.a ?? []).some(([name, value]) => name === 'role' && value === 'main') || node.properties?.role === 'main';
  const has = (nodes: unknown[] = []): boolean =>
    nodes.some((node) => typeof node === 'object' && node !== null && (isMain(node as Node) || has((node as Node).c ?? (node as Node).children)));
  return has(page?.tree ?? page?.ast?.children);
}

/**
 * A stored compile AST (hast) → page tree. Attribute names and values follow
 * generateStaticHTML (html-optimizer.ts), so the result equals what the
 * browser builds from the stored staticHTML.
 */
export function treeFromHast(node: TemplateNode): PageTreeNode[] {
  return childrenFromHast(node.children, false);
}

function childrenFromHast(children: TemplateNode[] | undefined, inSvg: boolean): PageTreeNode[] {
  return childrenWithRanges(children, inSvg).nodes;
}

/**
 * The children, and for each one that's text, where it is in the editor's
 * source ("12-20"), "x" when it can't be said (two pieces joined into one
 * DOM text node), or null for an element. Ranges only come from an editor
 * compile (compile-for-editor.ts positions).
 */
/** A loop's {item}, {p.name} or {i + 1} in text */
const PLACEHOLDER = /\{\s*[\w$.]+(?:\s*\+\s*\d+)?\s*\}/;

/**
 * style="position: sticky; top: 0" counts its top from below the site's
 * fixed nav, as the page's CSS does (css-transform.ts): at 0 it stuck
 * under the nav, out of sight (bug bash 2026-10-26)
 */
function stickyBelowNav(style: string): string {
  if (!/position\s*:\s*(?:-webkit-)?sticky/i.test(style)) return style;
  return style.replace(/(^|;)(\s*top\s*:\s*)([^;!]+?)(\s*(?:!\s*important\s*)?)(?=;|$)/i, (whole, before: string, prop: string, value: string, end: string) =>
    /^auto$/i.test(value.trim())
      ? whole
      : `${before}${prop}${/^[+-]?0*\.?0*$/.test(value.trim()) ? 'var(--ts-nav-height, 0px)' : `calc(${value.trim()} + var(--ts-nav-height, 0px))`}${end}`
  );
}

function childrenWithRanges(children: TemplateNode[] | undefined, inSvg: boolean): { nodes: PageTreeNode[]; ranges: Array<string | null> } {
  const nodes: PageTreeNode[] = [];
  const ranges: Array<string | null> = [];
  for (const child of children ?? []) {
    const converted = nodeFromHast(child, inSvg);
    if (converted === null || converted === '') continue;
    // A loop's {placeholder} shows each item's words, not the code's: offered
    // for editing, every change was refused (bug bash 2026-10-26)
    const range = typeof converted === 'string'
      ? (child.tsRange && !PLACEHOLDER.test(converted) ? `${child.tsRange[0]}-${child.tsRange[1]}` : 'x')
      : null;
    // Adjacent text is one text node in the DOM
    if (typeof converted === 'string' && typeof nodes[nodes.length - 1] === 'string') {
      nodes[nodes.length - 1] += converted;
      ranges[ranges.length - 1] = 'x';
    } else {
      nodes.push(converted);
      ranges.push(range);
    }
  }
  return { nodes, ranges };
}

function nodeFromHast(node: TemplateNode, inSvg: boolean): PageTreeNode | null {
  if (node.type === 'text') return node.value || '';
  if (node.type === 'root') return null;
  if (node.type !== 'element' || !node.tagName) return null;

  const svg = inSvg || node.tagName === 'svg';
  const space = svg ? svgSpace : htmlSpace;
  const attrs: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(node.properties ?? {})) {
    if (value == null || value === false) continue;
    // Saved before the sanitizer took these out
    if (key === 'action' && node.tagName === 'form' && postsToApi(value)) continue;
    const info = find(space, key);
    if (value === true) attrs.push([info.attribute, '']);
    else if (Array.isArray(value)) attrs.push([info.attribute, value.join(info.commaSeparated ? ', ' : ' ')]);
    else attrs.push([info.attribute, info.attribute === 'style' ? stickyBelowNav(String(value)) : String(value)]);
  }

  const el: PageTreeElement = { t: node.tagName };
  const { nodes, ranges } = childrenWithRanges(node.children, svg);
  const children = withoutTableWhitespace(node.tagName, nodes);
  // Words on the preview: where this element's words and start tag are in
  // the editor's source (an editor compile only; stored pages have neither)
  const textRanges = children === nodes
    ? ranges.filter((range): range is string => range !== null)
    : nodes.flatMap((child, i) => (typeof child === 'string' && children.includes(child) && ranges[i] !== null ? [ranges[i] as string] : []));
  if (textRanges.some((range) => range !== 'x')) attrs.push(['data-ts-text', textRanges.join(',')]);
  if (node.tsAt !== undefined) attrs.push(['data-ts-at', String(node.tsAt)]);
  if (attrs.length) el.a = attrs;
  if (children.length) el.c = children;
  if (svg) el.svg = 1;
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Parsed DOM (a container's children) → page tree. Browser only. */
export function treeFromDom(parent: ParentNode): PageTreeNode[] {
  const out: PageTreeNode[] = [];
  parent.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      if (node.textContent) out.push(node.textContent);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const el: PageTreeElement = { t: element.localName };
    if (element.attributes.length) {
      el.a = Array.from(element.attributes, (attr) => [attr.name, attr.value] as [string, string]).filter(
        ([name, value]) => !(name === 'action' && el.t === 'form' && postsToApi(value))
      );
    }
    const children = withoutTableWhitespace(el.t, treeFromDom(element));
    if (children.length) el.c = children;
    if (element.namespaceURI === SVG_NS) el.svg = 1;
    out.push(el);
  });
  return out;
}

/**
 * The line breaks between a table's rows and cells aren't the table's: the
 * browser keeps them, and React warns about every one (whitespace text
 * can't be a child of <tr>), so they're left out.
 */
const TABLE_PARTS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup']);
function withoutTableWhitespace(tag: string, children: PageTreeNode[]): PageTreeNode[] {
  return TABLE_PARTS.has(tag) ? children.filter((child) => typeof child !== 'string' || child.trim() !== '') : children;
}
