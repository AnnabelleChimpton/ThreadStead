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
import { treeFromHast, type PageTreeNode } from './page-tree';
import { isPageArtifact, renderArtifact, forViewer, type PageForRender, type PageViewer } from './page-artifact';

export type { PageForRender, PageViewer } from './page-artifact';

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
  if (isPageArtifact(compiled)) return renderArtifact(compiled, viewer);
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
