/**
 * Renders a page of your own HTML from its page tree (page-tree.ts). Its
 * components, where the compiler left their island placeholders, are drawn
 * by `renderIsland` (PageWithComponents.tsx), which brings the component
 * registry: a page with none never loads it.
 *
 * Pure: the same props give the same elements on the server and in the
 * browser, so the page is server-rendered and hydrated like any React page.
 */
import React from 'react';
import { importantStyleRef, parseStyleString } from '@/lib/utils/css/parse-style-string';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { domAttributeToReactProp } from '@/lib/templates/core/attribute-mappings';
import { islandIdOf, type PageTreeElement, type PageTreeNode } from './page-tree';

/** Draws one component with what the page put inside it, or null when it isn't registered */
export type RenderIsland = (island: Island, children: React.ReactNode[] | undefined, residentData: ResidentData) => React.ReactNode | null;

export interface IslandPageProps {
  tree: PageTreeNode[];
  islands: Island[];
  residentData: ResidentData;
  renderIsland?: RenderIsland;
}

export default function IslandPage({ tree, islands, residentData, renderIsland }: IslandPageProps) {
  const islandMap = React.useMemo(() => {
    const map = new Map<string, Island>();
    for (const island of islands) if (!map.has(island.id)) map.set(island.id, island);
    return map;
  }, [islands]);
  return <>{renderChildren(tree, { islandMap, residentData, renderIsland }, 'n')}</>;
}

interface WalkContext {
  islandMap: Map<string, Island>;
  residentData: ResidentData;
  renderIsland?: RenderIsland;
}

function renderChildren(nodes: PageTreeNode[] | undefined, ctx: WalkContext, keyPrefix: string): React.ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, ctx, `${keyPrefix}.${i}`));
}

function renderNode(node: PageTreeNode, ctx: WalkContext, key: string): React.ReactNode {
  if (typeof node === 'string') return node;

  const islandId = islandIdOf(node);
  const island = islandId ? ctx.islandMap.get(islandId) : undefined;
  if (island && ctx.renderIsland) {
    const children = renderChildren(node.c, ctx, key).map(markPageHTML);
    const drawn = ctx.renderIsland(island, children.length > 0 ? children : undefined, ctx.residentData);
    if (drawn) return drawn;
    console.error(`Template component "${island.component}" isn't registered`);
  }

  // The page's own HTML. Attribute → prop the same way for every element:
  // class → className, controls → controls: true, aria-label stays.
  const props: Record<string, unknown> = { key };
  // Its children are HTML, with no component in them (page-html.ts)
  if (node.h !== undefined) props.dangerouslySetInnerHTML = stableHtml(node);
  for (const [name, value] of node.a ?? []) {
    if (name === 'style') {
      props.style = parseStyleString(value);
      props.ref = importantStyleRef(props.style as Record<string, string>);
    } else if (!node.svg && LEGACY_ATTRIBUTES.has(name.toLowerCase())) {
      // React has no prop for these: as a plain attribute they render as written
      props[name.toLowerCase()] = value;
    } else {
      const [propName, propValue] = domAttributeToReactProp(node.t, name, value, node.svg === 1);
      props[propName] = propValue;
    }
  }
  // hidden="until-found": React only writes hidden="", which find-in-page can't open
  if ((node.a ?? []).some(([name, value]) => name === 'hidden' && value === 'until-found')) {
    props.hidden = true;
    const styleRef = props.ref as ((el: HTMLElement | null) => void) | undefined;
    props.ref = (el: HTMLElement | null) => {
      styleRef?.(el);
      el?.setAttribute('hidden', 'until-found');
    };
  }
  // A select starts on its selected option, the way React wants it said
  if (node.t === 'select') {
    const chosen = selectedOptions(node);
    if (chosen.length) props.defaultValue = props.multiple ? chosen : chosen[0];
  }
  if (node.t === 'option') delete props.selected;
  if (node.h !== undefined) return React.createElement(node.t, props);
  const children = renderChildren(node.c, ctx, key);
  // A textarea's text is its starting value
  if (node.t === 'textarea' && children.every((child) => typeof child === 'string')) {
    if (children.length) props.defaultValue = children.join('');
    return React.createElement(node.t, props);
  }
  return React.createElement(node.t, props, ...children);
}

/**
 * The same { __html } object for a node every render: React rewrites an
 * element's HTML whenever the object is new, which restarted GIFs, closed
 * <details> and emptied inputs on every re-render.
 */
const htmlObjects = new WeakMap<PageTreeElement, { __html: string }>();
export function stableHtml(node: PageTreeElement): { __html: string } {
  let html = htmlObjects.get(node);
  if (!html) htmlObjects.set(node, (html = { __html: node.h ?? '' }));
  return html;
}

/** The values of a <select>'s options marked selected (its value, or else its text) */
function selectedOptions(select: PageTreeElement): string[] {
  const text = (node: PageTreeNode): string => (typeof node === 'string' ? node : (node.c ?? []).map(text).join(''));
  const options = (select.c ?? []).flatMap((child) =>
    typeof child === 'string' ? [] : child.t === 'optgroup' ? (child.c ?? []).filter((o): o is PageTreeElement => typeof o !== 'string') : [child]
  );
  return options
    .filter((option) => option.t === 'option' && option.a?.some(([name]) => name === 'selected'))
    .map((option) => option.a?.find(([name]) => name === 'value')?.[1] ?? text(option).trim());
}

/**
 * The page's own HTML handed to a component (a <Show>'s scene, a card's
 * text) is the page's again: data-ts-page ends the component's part, where
 * the site's reset applies (styles/preflight.css), so it gets the browser's
 * defaults like the rest of the page. Each component draws inside a
 * <ts-island> (IslandErrorBoundary).
 */
function markPageHTML(child: React.ReactNode): React.ReactNode {
  return React.isValidElement(child) && typeof child.type === 'string'
    ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, { 'data-ts-page': '' })
    : child;
}

/** Old-web HTML attributes React doesn't know (it would drop or warn on their camelCase props) */
const LEGACY_ATTRIBUTES = new Set([
  'bgcolor', 'valign', 'nowrap', 'hspace', 'vspace', 'alink', 'vlink', 'charoff', 'axis', 'compact', 'noshade',
]);
