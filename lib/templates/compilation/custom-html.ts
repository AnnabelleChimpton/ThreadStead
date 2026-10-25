/**
 * <CustomHTMLElement content="…"> (and innerHTML="…") carries HTML inside an
 * attribute value, where the page sanitizer never looks. It's cleaned here,
 * on the server, with the page's own parser and allowlist: when a page is
 * built (compileForEditor, the widget slot's compile) and again on every
 * server render of a stored page (load-resident-page.ts, publicWidgetSlot),
 * which covers rows stored before the check existed. The component trusts
 * what reaches it: cleaning it in the browser put the whole HTML compiler in
 * every page's JavaScript.
 */
import type { Island } from './compiler/types';
import { astToJson, parseTemplate, type TemplateNode } from './template-parser';
import { generateStaticHTML } from './compiler/html-optimizer';

function unwrapComponents(node: TemplateNode): TemplateNode[] {
  const children = (node.children || []).flatMap(unwrapComponents);
  if (node.component) return children;
  return [{ ...node, children }];
}

/** Components inside can't run from a string, so they unwrap to their children */
export function sanitizeCustomHTML(html: string): string {
  if (!html.trim()) return '';
  try {
    const [root] = unwrapComponents(astToJson(parseTemplate(html)));
    return generateStaticHTML(root, []);
  } catch {
    return '';
  }
}

const HTML_PROPS = ['content', 'innerHTML'] as const;

function cleanProps(props: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!props || !HTML_PROPS.some((name) => typeof props[name] === 'string')) return props;
  const cleaned = { ...props };
  for (const name of HTML_PROPS) if (typeof cleaned[name] === 'string') cleaned[name] = sanitizeCustomHTML(cleaned[name] as string);
  return cleaned;
}

/** The islands with every CustomHTMLElement's HTML props cleaned (the rest as they are) */
export function cleanCustomHtmlIslands(islands: Island[]): Island[] {
  return islands.map((island) =>
    island.component.toLowerCase() !== 'customhtmlelement'
      ? island
      : {
          ...island,
          props: cleanProps(island.props) ?? {},
          ...(island._precomputed && {
            _precomputed: { ...island._precomputed, componentProps: cleanProps(island._precomputed.componentProps) ?? {} },
          }),
        }
  );
}
