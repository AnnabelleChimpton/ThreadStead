/**
 * Server only: turns what a page of your own HTML stores into what the
 * profile page sends to the browser for it.
 *
 * A page's artifact (Profile.pageArtifact, page-artifact.ts) already holds
 * its tree. A page not yet recompiled has its old compile result
 * (Profile.compiledTemplate): the tree comes from its AST, or, for rows from
 * before the AST was kept, from its staticHTML, parsed with the same HTML
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
import { isPageArtifact } from './page-artifact';

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

/**
 * Without a viewer, the page is rendered for a visitor. A page that already
 * went through here (the profile API sends a visitor theirs) comes back as is.
 */
export function pageForRender(compiled: unknown, viewer: PageViewer = { isOwner: false }): PageForRender | null {
  if (isPageArtifact(compiled)) return forViewer(compiled.tree, compiled.islands, compiled.head, viewer);
  const stored = compiled as StoredCompileResult | null | undefined;
  if (!stored || typeof stored !== 'object') return null;
  if (Array.isArray((stored as Partial<PageForRender>).tree)) return stored as unknown as PageForRender;

  let tree: PageTreeNode[];
  if (stored.ast && stored.ast.type === 'root') {
    tree = treeFromHast(stored.ast);
  } else if (typeof stored.staticHTML === 'string' && stored.staticHTML.trim()) {
    const parsed = unified().use(rehypeParse, { fragment: true }).parse(stored.staticHTML);
    tree = treeFromHast(parsed as unknown as TemplateNode);
  } else {
    return null;
  }
  return forViewer(tree, (Array.isArray(stored.islands) ? stored.islands : []) as Island[], stored.ast?.head, viewer);
}

/** The page with the other side's IfOwner / IfVisitor content left out, and the islands only that content used */
function forViewer(tree: PageTreeNode[], islands: Island[], head: DocumentHead | undefined, viewer: PageViewer): PageForRender {
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
  const dropped = new Set([...removed].filter((id) => !kept.has(id)));
  return {
    tree: pruned,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    islands: islands.filter((island) => !dropped.has(island.id)).map(({ children, placeholder, ...island }) => island as Island),
    // Next can't serialize undefined
    ast: head ? { head } : {},
  };
}
