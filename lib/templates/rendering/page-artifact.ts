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
import { treeFromHast, type PageTreeNode } from './page-tree';

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
