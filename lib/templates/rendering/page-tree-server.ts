/**
 * Server only: turns a stored compile result (Profile.compiledTemplate) into
 * what the profile page sends to the browser for a page of your own HTML.
 *
 * The page tree comes from the stored AST. Rows saved before the AST was kept
 * alongside have only staticHTML; that is parsed here with the same HTML
 * parser the browser uses, so those pages render on the server too.
 */
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import type { DocumentHead } from '@/lib/templates/compilation/document-head';
import { treeFromHast, type PageTreeNode } from './page-tree';

export interface PageForRender {
  tree: PageTreeNode[];
  /** Islands without the copies nothing reads at render (children, placeholder) */
  islands: Island[];
  /** Read by _app.tsx (documentCssFromCompiledTemplate) and the page's <title> */
  ast: { head?: DocumentHead };
}

interface StoredCompileResult {
  staticHTML?: string;
  islands?: Island[];
  ast?: TemplateNode & { head?: DocumentHead };
}

export function pageForRender(compiled: unknown, storedIslands?: unknown): PageForRender | null {
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

  const islands = (Array.isArray(stored.islands) ? stored.islands : Array.isArray(storedIslands) ? storedIslands : []) as Island[];
  return {
    tree,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    islands: islands.map(({ children, placeholder, ...island }) => island as Island),
    // Next can't serialize undefined
    ast: stored.ast?.head ? { head: stored.ast.head } : {},
  };
}
