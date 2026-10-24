/**
 * What a page of your own HTML stores to render from (Profile.pageArtifact):
 * its page tree, its components and its head, built once at save. Visits
 * prune it for the viewer (pageForRender) and render it; nothing reads the
 * parse tree the compile started from, which was 70-90% of the old stored
 * copy (Profile.compiledTemplate) and, as nested jsonb, made a page nested
 * ~57 levels deep fail to save.
 *
 * Stored as JSON text: Postgres keeps it as one value, Prisma never walks it.
 */
import type { Island } from '@/lib/templates/compilation/compiler';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import type { DocumentHead } from '@/lib/templates/compilation/document-head';
import { treeFromHast, islandIdOf, type PageTreeNode } from './page-tree';

/**
 * Bump when what's built here changes (the compiler's output, the tree's
 * shape): scripts/recompile-pages.ts rebuilds every stored artifact that
 * differs, and a visit to one it hasn't reached yet still renders it.
 */
export const ARTIFACT_VERSION = 1;

export interface PageArtifact {
  v: number;
  /** The whole page, both sides of IfOwner / IfVisitor: pruned per viewer at render */
  tree: PageTreeNode[];
  /** Without the copies nothing reads at render (children, placeholder) */
  islands: Island[];
  /** Title, fonts, <html>/<body> attributes and colours (document-head.ts) */
  head?: DocumentHead;
}

/** From the editor compile's result (compile-for-editor.ts) */
export function artifactFor(compiled: { ast: TemplateNode & { head?: DocumentHead }; islands: Island[] }): PageArtifact {
  return {
    v: ARTIFACT_VERSION,
    tree: treeFromHast(compiled.ast),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    islands: compiled.islands.map(({ children, placeholder, ...island }) => island as Island),
    ...(compiled.ast.head && { head: compiled.ast.head }),
  };
}

export const serializeArtifact = (artifact: PageArtifact): string => JSON.stringify(artifact);

/** The stored text, or null when there's none or it isn't one */
export function parseArtifact(text: string | null | undefined): PageArtifact | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as Partial<PageArtifact>;
    return typeof value?.v === 'number' && Array.isArray(value.tree) && Array.isArray(value.islands) ? (value as PageArtifact) : null;
  } catch {
    return null;
  }
}

export function isPageArtifact(value: unknown): value is PageArtifact {
  return typeof (value as PageArtifact | null)?.v === 'number' && Array.isArray((value as PageArtifact).tree);
}

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

/** An artifact as one viewer sees it: what the live page and the editor's preview both render */
export function renderArtifact(artifact: PageArtifact, viewer: PageViewer): PageForRender {
  return forViewer(artifact.tree, artifact.islands, artifact.head, viewer);
}

/** The page with the other side's IfOwner / IfVisitor content left out, and the islands only that content used */
export function forViewer(tree: PageTreeNode[], islands: Island[], head: DocumentHead | undefined, viewer: PageViewer): PageForRender {
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
