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
  const page = compiled as { tree?: unknown[]; ast?: { children?: unknown[] } } | null | undefined;
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
  const out: PageTreeNode[] = [];
  for (const child of children ?? []) {
    const converted = nodeFromHast(child, inSvg);
    if (converted === null) continue;
    // Adjacent text is one text node in the DOM
    if (typeof converted === 'string' && typeof out[out.length - 1] === 'string') {
      out[out.length - 1] += converted;
    } else {
      out.push(converted);
    }
  }
  return out.filter((n) => n !== '');
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
    else attrs.push([info.attribute, String(value)]);
  }

  const el: PageTreeElement = { t: node.tagName };
  if (attrs.length) el.a = attrs;
  const children = childrenFromHast(node.children, svg);
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
    const children = treeFromDom(element);
    if (children.length) el.c = children;
    if (element.namespaceURI === SVG_NS) el.svg = 1;
    out.push(el);
  });
  return out;
}

const ROOT_CONTAINER = /pure-absolute-container|advanced-template-container/;

/**
 * Give the page its `#profile-<id>` root. An old Visual Builder page has a
 * root container already and takes the id there; any other page gets a new
 * `<div id class="pure-absolute-container">` around it.
 */
export function withProfileRoot(tree: PageTreeNode[], profileId: string): PageTreeNode[] {
  if (containsId(tree, profileId)) return tree;
  const container = findFirst(tree, (el) => el.t === 'div' && ROOT_CONTAINER.test(attr(el, 'class') ?? ''));
  if (!container) {
    return [{ t: 'div', a: [['id', profileId], ['class', 'pure-absolute-container']], c: tree }];
  }
  return mapTree(tree, (el) =>
    el === container ? { ...el, a: [['id', profileId], ...(el.a ?? []).filter(([n]) => n !== 'id')] } : el
  );
}

function attr(el: PageTreeElement, name: string): string | undefined {
  return el.a?.find(([n]) => n === name)?.[1];
}

function containsId(tree: PageTreeNode[], id: string): boolean {
  return findFirst(tree, (el) => attr(el, 'id') === id) !== null;
}

function findFirst(tree: PageTreeNode[], test: (el: PageTreeElement) => boolean): PageTreeElement | null {
  for (const node of tree) {
    if (typeof node === 'string') continue;
    if (test(node)) return node;
    const inner = findFirst(node.c ?? [], test);
    if (inner) return inner;
  }
  return null;
}

function mapTree(tree: PageTreeNode[], fn: (el: PageTreeElement) => PageTreeElement): PageTreeNode[] {
  return tree.map((node) => {
    if (typeof node === 'string') return node;
    const mapped = fn(node);
    return mapped.c ? { ...mapped, c: mapTree(mapped.c, fn) } : mapped;
  });
}
