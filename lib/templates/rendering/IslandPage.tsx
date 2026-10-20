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
import { parseStyleString } from '@/lib/utils/css/parse-style-string';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { domAttributeToReactProp } from '@/lib/templates/core/attribute-mappings';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { positioningRegistry } from '@/lib/templates/positioning';
import { IslandErrorBoundary } from '@/components/core/profile/IslandErrorBoundary';
import { islandIdOf, type PageTreeNode } from './page-tree';

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
  return <>{renderChildren(tree, { islandMap, residentData }, false, 'n')}</>;
}

interface WalkContext {
  islandMap: Map<string, Island>;
  residentData: ResidentData;
}

function renderChildren(
  nodes: PageTreeNode[] | undefined,
  ctx: WalkContext,
  isNestedComponent: boolean,
  keyPrefix: string
): React.ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, ctx, isNestedComponent, `${keyPrefix}.${i}`));
}

function renderNode(
  node: PageTreeNode,
  ctx: WalkContext,
  isNestedComponent: boolean,
  key: string
): React.ReactNode {
  if (typeof node === 'string') return node;

  const islandId = islandIdOf(node);
  const island = islandId ? ctx.islandMap.get(islandId) : undefined;
  if (island) {
    const Component = getComponent(island.component);
    if (Component) {
      const children = renderChildren(node.c, ctx, true, key);
      return renderIsland(island, Component, children.length > 0 ? children : undefined, ctx, isNestedComponent);
    }
    console.error(`Template component "${island.component}" isn't registered`);
  }

  // The page's own HTML. Attribute → prop the same way for every element:
  // class → className, controls → controls: true, aria-label stays.
  const props: Record<string, unknown> = { key };
  for (const [name, value] of node.a ?? []) {
    if (name === 'style') {
      props.style = parseStyleString(value);
    } else if (!node.svg && LEGACY_ATTRIBUTES.has(name.toLowerCase())) {
      // React has no prop for these: as a plain attribute they render as written
      props[name.toLowerCase()] = value;
    } else {
      const [propName, propValue] = domAttributeToReactProp(node.t, name, value, node.svg === 1);
      props[propName] = propValue;
    }
  }
  const children = renderChildren(node.c, ctx, isNestedComponent, key);
  // A textarea's text is its starting value
  if (node.t === 'textarea' && children.every((child) => typeof child === 'string')) {
    if (children.length) props.defaultValue = children.join('');
    return React.createElement(node.t, props);
  }
  return React.createElement(node.t, props, ...children);
}

/** Old-web HTML attributes React doesn't know (it would drop or warn on their camelCase props) */
const LEGACY_ATTRIBUTES = new Set([
  'bgcolor', 'valign', 'nowrap', 'hspace', 'vspace', 'alink', 'vlink', 'charoff', 'axis', 'compact', 'noshade',
]);

function renderIsland(
  island: Island,
  Component: React.ComponentType<Record<string, unknown>>,
  children: React.ReactNode[] | undefined,
  ctx: WalkContext,
  isNestedComponent: boolean
): React.ReactNode {
  const positioningData = island.props._positioning;
  let componentProps: Record<string, unknown>;

  if (island._precomputed) {
    // Props split into component props and styles at save time
    componentProps = {
      ...island._precomputed.componentProps,
      style: island._precomputed.styles,
    };
  } else {
    // Islands stored before the split was precomputed
    const props = positioningData ? stripPositioningFromProps(island.props) : island.props;
    const { cssProps } = separateCSSProps(props);
    const existingStyle =
      typeof props.style === 'string' ? parseStyleString(props.style) : (props.style as React.CSSProperties) || {};
    componentProps = {
      ...props,
      style: {
        ...(positioningData ? stripPositioningFromStyle(existingStyle) : existingStyle),
        ...applyCSSProps(cssProps),
      },
    };
  }
  if (positioningData) componentProps._positioningMode = 'absolute';

  const rendered = (
    <IslandErrorBoundary islandId={island.id} key={island.id}>
      <ResidentDataProvider data={ctx.residentData}>
        <Component {...componentProps}>{children}</Component>
      </ResidentDataProvider>
    </IslandErrorBoundary>
  );

  return positioningRegistry.applyPositioning(
    rendered,
    { island, isNestedComponent },
    { componentType: island.component.toLowerCase(), islandId: island.id }
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


/**
 * A positioned island gets its position from the strategy's wrapper, so the
 * component itself must not carry position/top/left… (it would be
 * positioned twice). Old Visual Builder islands carry them as flat props
 * and inside `style`.
 */
function stripPositioningFromStyle(style: React.CSSProperties): React.CSSProperties {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { position, top, right, bottom, left, zIndex, ...rest } = style;
  return rest;
}

function stripPositioningFromProps(props: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { position, top, right, bottom, left, zIndex, ...rest } = props;
  if (typeof rest.style === 'string') {
    const kept = Object.entries(stripPositioningFromStyle(parseStyleString(rest.style)));
    if (kept.length) {
      rest.style = kept.map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ');
    } else {
      delete rest.style;
    }
  } else if (rest.style && typeof rest.style === 'object') {
    rest.style = stripPositioningFromStyle(rest.style as React.CSSProperties);
    if (Object.keys(rest.style as object).length === 0) delete rest.style;
  }
  return rest;
}
