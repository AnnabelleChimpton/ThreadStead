/**
 * Renders a page of your own HTML from its page tree (page-tree.ts), putting
 * each registered component where the compiler left its island placeholder.
 *
 * Pure: the same props give the same elements on the server and in the
 * browser, so the page is server-rendered and hydrated like any React page.
 *
 * Each island is `IslandErrorBoundary > ResidentDataProvider > Component`.
 * Keep that shape: event and layout components (OnClick, Timeout,
 * ImageCarousel…) look through it to find their children.
 */
import React from 'react';
import { importantStyleRef, parseStyleString } from '@/lib/utils/css/parse-style-string';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { domAttributeToReactProp } from '@/lib/templates/core/attribute-mappings';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { IslandErrorBoundary } from '@/components/core/profile/IslandErrorBoundary';
import { islandIdOf, type PageTreeElement, type PageTreeNode } from './page-tree';

export interface IslandPageProps {
  tree: PageTreeNode[];
  islands: Island[];
  residentData: ResidentData;
}

export default function IslandPage({ tree, islands, residentData }: IslandPageProps) {
  const islandMap = React.useMemo(() => {
    const map = new Map<string, Island>();
    for (const island of islands) if (!map.has(island.id)) map.set(island.id, island);
    return map;
  }, [islands]);
  return <>{renderChildren(tree, { islandMap, residentData }, 'n')}</>;
}

interface WalkContext {
  islandMap: Map<string, Island>;
  residentData: ResidentData;
}

function renderChildren(nodes: PageTreeNode[] | undefined, ctx: WalkContext, keyPrefix: string): React.ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, ctx, `${keyPrefix}.${i}`));
}

function renderNode(node: PageTreeNode, ctx: WalkContext, key: string): React.ReactNode {
  if (typeof node === 'string') return node;

  const islandId = islandIdOf(node);
  const island = islandId ? ctx.islandMap.get(islandId) : undefined;
  if (island) {
    const Component = getComponent(island.component);
    if (Component) {
      const children = renderChildren(node.c, ctx, key).map(markPageHTML);
      return renderIsland(island, Component, children.length > 0 ? children : undefined, ctx);
    }
    console.error(`Template component "${island.component}" isn't registered`);
  }

  // The page's own HTML. Attribute → prop the same way for every element:
  // class → className, controls → controls: true, aria-label stays.
  const props: Record<string, unknown> = { key };
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
  const children = renderChildren(node.c, ctx, key);
  // A textarea's text is its starting value
  if (node.t === 'textarea' && children.every((child) => typeof child === 'string')) {
    if (children.length) props.defaultValue = children.join('');
    return React.createElement(node.t, props);
  }
  return React.createElement(node.t, props, ...children);
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

function renderIsland(
  island: Island,
  Component: React.ComponentType<Record<string, unknown>>,
  children: React.ReactNode[] | undefined,
  ctx: WalkContext
): React.ReactNode {
  let componentProps: Record<string, unknown>;

  if (island._precomputed) {
    // Props split into component props and styles at save time
    componentProps = {
      ...island._precomputed.componentProps,
      style: island._precomputed.styles,
    };
  } else {
    // Islands stored before the split was precomputed
    const props = island.props;
    const { cssProps } = separateCSSProps(props);
    const existingStyle =
      typeof props.style === 'string' ? parseStyleString(props.style) : (props.style as React.CSSProperties) || {};
    componentProps = {
      ...props,
      style: {
        ...existingStyle,
        ...applyCSSProps(cssProps),
      },
    };
  }

  return (
    <IslandErrorBoundary
      islandId={island.id}
      key={island.id}
      component={island.component}
      ownerSees={ctx.residentData.viewer?.id != null && ctx.residentData.viewer.id === ctx.residentData.owner?.id}
    >
      <ResidentDataProvider data={ctx.residentData}>
        <Component {...componentProps}>{children}</Component>
      </ResidentDataProvider>
    </IslandErrorBoundary>
  );
}

function getComponent(name: string): React.ComponentType<Record<string, unknown>> | null {
  const registration = componentRegistry.get(name);
  if (registration) return registration.component as React.ComponentType<Record<string, unknown>>;
  // Choose's branches live on Choose
  const lower = name.toLowerCase();
  if (lower === 'when' || lower === 'otherwise') {
    const choose = componentRegistry.get('Choose')?.component as unknown as
      | Record<string, React.ComponentType<Record<string, unknown>>>
      | undefined;
    return (lower === 'when' ? choose?.When : choose?.Otherwise) ?? null;
  }
  return null;
}

