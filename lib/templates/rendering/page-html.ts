/**
 * React touches only what can change: a page of your own HTML is sent with
 * every part that has no component in it as HTML (collapsePage), which the
 * browser parses itself. React walks only the way down to each component; a
 * page with none is one element with its HTML. React used to build and
 * hydrate every tag, which was most of a big page's main-thread time on a
 * phone, for markup nothing would ever update.
 *
 * Done once per server render (load-resident-page.ts), after the page is
 * pruned for its viewer. Never inside a component: those read and clone the
 * HTML they're given (WaveText, OnClick, Tabs…).
 */
import { islandIdOf, pageHasMain, type PageTreeElement, type PageTreeNode } from './page-tree';
import type { PageForRender } from './page-artifact';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** React keeps their value (defaultValue and selected), so they stay React's */
const REACT_MANAGED = new Set(['textarea', 'select', 'option', 'optgroup']);
/** The HTML parser drops the first line break after these start tags */
const DROPS_FIRST_NEWLINE = new Set(['pre', 'textarea', 'listing']);

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** A page tree as HTML: what the browser parses back into the same DOM */
export function htmlOf(nodes: PageTreeNode[] = []): string {
  return nodes.map(htmlOfNode).join('');
}

function htmlOfNode(node: PageTreeNode): string {
  if (typeof node === 'string') return escapeText(node);
  const attributes = (node.a ?? []).map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('');
  if (VOID.has(node.t) && !node.svg) return `<${node.t}${attributes}>`;
  const inner = node.h ?? htmlOf(node.c);
  const first = DROPS_FIRST_NEWLINE.has(node.t) && inner.startsWith('\n') ? '\n' : '';
  return `<${node.t}${attributes}>${first}${inner}</${node.t}>`;
}

/**
 * The page with each part that holds no component as its HTML (`h`), or, for
 * a page with no components, all of it (`html`). `hasMain` is worked out
 * first, from the whole tree.
 */
export function collapsePage(page: PageForRender): PageForRender {
  const hasMain = pageHasMain(page);
  if (page.islands.length === 0) return { ...page, tree: [], html: htmlOf(page.tree), hasMain };
  const islandIds = new Set(page.islands.map((island) => island.id));
  const isIsland = (el: PageTreeElement) => {
    const id = islandIdOf(el);
    return !!id && islandIds.has(id);
  };
  const holdsIsland = (el: PageTreeElement): boolean =>
    isIsland(el) || (el.c ?? []).some((child) => typeof child !== 'string' && holdsIsland(child));
  const collapse = (nodes: PageTreeNode[]): PageTreeNode[] =>
    nodes.map((node) => {
      if (typeof node === 'string' || !node.c?.length || isIsland(node)) return node;
      if (!holdsIsland(node) && !REACT_MANAGED.has(node.t)) {
        const { c, ...element } = node;
        return { ...element, h: htmlOf(c) };
      }
      return { ...node, c: collapse(node.c) };
    });
  return { ...page, tree: collapse(page.tree), hasMain };
}
