/**
 * A page of your own HTML with its components: IslandPage, with each island
 * drawn from the component registry. Loaded only for a page that has
 * components (HTMLIslandHydration.tsx), as one chunk: the registry brings
 * every component's code.
 *
 * Each island is `IslandErrorBoundary > ResidentDataProvider > Component`.
 * Keep that shape: event and layout components (OnClick, Timeout,
 * ImageCarousel…) look through it to find their children.
 */
import React from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';
import { ResidentDataProvider, type ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { parseStyleString } from '@/lib/utils/css/parse-style-string';
import { IslandErrorBoundary } from '@/components/core/profile/IslandErrorBoundary';
import { isLook } from '@/lib/templates/styling/component-parts';
import IslandPage, { type IslandPageProps } from './IslandPage';

export default function PageWithComponents(props: Omit<IslandPageProps, 'renderIsland'>) {
  return <IslandPage {...props} renderIsland={renderIsland} />;
}

function renderIsland(island: Island, children: React.ReactNode[] | undefined, residentData: ResidentData, sourceAt?: string): React.ReactNode | null {
  const Component = getComponent(island.component);
  if (!Component) return null;

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

  // look="plain" is the island's, not the component's (styles/component-parts.css)
  const { look, ...forComponent } = componentProps;
  componentProps = forComponent;

  return (
    <IslandErrorBoundary
      islandId={island.id}
      key={island.id}
      component={island.component}
      sourceAt={sourceAt}
      look={isLook(look) ? look : undefined}
      ownerSees={residentData.viewer?.id != null && residentData.viewer.id === residentData.owner?.id}
    >
      <ResidentDataProvider data={residentData}>
        <Component {...componentProps}>{children}</Component>
      </ResidentDataProvider>
    </IslandErrorBoundary>
  );
}

function getComponent(name: string): React.ComponentType<Record<string, unknown>> | null {
  const registration = componentRegistry.get(name);
  return registration ? (registration.component as React.ComponentType<Record<string, unknown>>) : null;
}
