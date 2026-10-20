/**
 * Server only: turns a stored compile result (Profile.compiledTemplate) into
 * what the profile page sends to the browser for a page of your own HTML.
 *
 * The page tree comes from the stored AST. Rows saved before the AST was kept
 * alongside have only staticHTML; that is parsed here with the same HTML
 * parser the browser uses, so those pages render on the server too.
 *
 * <IfOwner> / <IfVisitor> are decided here for the viewer: the other side's
 * content is dropped from what's sent, not just left unrendered (it would
 * still be readable in the page data). Their island stays, childless, and
 * renders nothing for this viewer either way, so hydration agrees.
 */
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import type { DocumentHead } from '@/lib/templates/compilation/document-head';
import { treeFromHast, islandIdOf, type PageTreeNode } from './page-tree';

export interface PageForRender {
  tree: PageTreeNode[];
  /** Islands without the copies nothing reads at render (children, placeholder) */
  islands: Island[];
  /** Read by _app.tsx (documentCssFromCompiledTemplate) and the page's <title> */
  ast: { head?: DocumentHead };
}

/** Who the page is rendered for (IfOwner's own test: viewerIsOwner) */
export interface PageViewer {
  isOwner: boolean;
}

interface StoredCompileResult {
  staticHTML?: string;
  islands?: Island[];
  ast?: TemplateNode & { head?: DocumentHead };
}

/** Without a viewer, the page is rendered for a visitor */
export function pageForRender(
  compiled: unknown,
  storedIslands?: unknown,
  viewer: PageViewer = { isOwner: false }
): PageForRender | null {
  const stored = compiled as StoredCompileResult | null | undefined;
  if (!stored || typeof stored !== 'object') return null;

  let tree: PageTreeNode[];
  if (stored.ast && stored.ast.type === 'root') {
    tree = treeFromHast(stored.ast);
  } else if (typeof stored.staticHTML === 'string' && stored.staticHTML.trim()) {
    const parsed = unified().use(rehypeParse, { fragment: true }).parse(stored.staticHTML);
    tree = treeFromHast(parsed as unknown as TemplateNode);
  } else {
    return null;
  }

  const allIslands = (Array.isArray(stored.islands) ? stored.islands : Array.isArray(storedIslands) ? storedIslands : []) as Island[];
  const pruned = forViewer(tree, allIslands, viewer);
  const islands = allIslands.filter((island) => !pruned.droppedIslands.has(island.id));
  return {
    tree: pruned.tree,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    islands: islands.map(({ children, placeholder, ...island }) => island as Island),
    // Next can't serialize undefined
    ast: stored.ast?.head ? { head: stored.ast.head } : {},
  };
}

/** The tree with the other side's IfOwner / IfVisitor content left out, and the islands only that content used */
function forViewer(tree: PageTreeNode[], islands: Island[], viewer: PageViewer) {
  const componentOf = new Map<string, string>();
  for (const island of islands) {
    if (!componentOf.has(island.id)) componentOf.set(island.id, island.component.toLowerCase());
  }
  const hiddenFromViewer = viewer.isOwner ? 'ifvisitor' : 'ifowner';
  const removed = new Set<string>();
  const kept = new Set<string>();

  const collect = (nodes: PageTreeNode[] | undefined, into: Set<string>) => {
    for (const node of nodes ?? []) {
      if (typeof node === 'string') continue;
      const id = islandIdOf(node);
      if (id) into.add(id);
      collect(node.c, into);
    }
  };
  const prune = (nodes: PageTreeNode[]): PageTreeNode[] =>
    nodes.map((node) => {
      if (typeof node === 'string') return node;
      const id = islandIdOf(node);
      if (id) kept.add(id);
      if (id && componentOf.get(id) === hiddenFromViewer) {
        collect(node.c, removed);
        const { c, ...childless } = node;
        return childless;
      }
      return node.c ? { ...node, c: prune(node.c) } : node;
    });

  const pruned = prune(tree);
  // An island also used outside the dropped content stays
  const droppedIslands = new Set([...removed].filter((id) => !kept.has(id)));
  return { tree: pruned, droppedIslands };
}
