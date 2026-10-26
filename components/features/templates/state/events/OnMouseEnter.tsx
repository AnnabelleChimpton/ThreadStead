'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';
import { eventMarker, useElementEvent } from './element-events';

/**
 * OnMouseEnter Component - Event handler for mouse enter events
 *
 * Executes action components when the mouse enters the element.
 * Should be used as a child of hoverable elements.
 *
 * @example
 * ```xml
 * <div>
 *   <OnMouseEnter>
 *     <Set var="hovering" value="true" />
 *   </OnMouseEnter>
 *   <OnMouseLeave>
 *     <Set var="hovering" value="false" />
 *   </OnMouseLeave>
 *   Hover over me!
 * </div>
 * ```
 */

export interface OnMouseEnterProps {
  /** Action components to execute on mouse enter */
  children?: React.ReactNode;

  /** A selector for the page elements to watch, instead of the element it sits in */
  target?: string;

}

export default function OnMouseEnter(props: OnMouseEnterProps) {
  const { children, target } = props;
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // Inside an EventDiv, the EventDiv runs it (useOnMouseEnterHandler).
  // Anywhere else: on the element it sits in, or the elements matching target
  const marker = useElementEvent('enter', target, (element) => {
    executeActions(children, templateState, residentData, forEachContext, element);
  });
  return eventMarker(marker);
}

/**
 * Hook to create a mouse enter handler
 * Used by parent elements to attach onMouseEnter handlers
 *
 * @param children Component children to search for OnMouseEnter
 * @returns Mouse enter handler function
 */
export function useOnMouseEnterHandler(children: React.ReactNode): ((event?: React.MouseEvent) => void) | null {
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // P1.4: Memoize finding OnMouseEnter child
  const onMouseEnterChild = React.useMemo(() => {
    let found: React.ReactElement | null = null;

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;

      // P3.3 FIX: Unwrap IslandErrorBoundary if present (islands architecture)
      let actualChild = child;
      if (typeof child.type === 'function' &&
          (child.type.name === 'IslandErrorBoundary' ||
           (child.type as any).displayName === 'IslandErrorBoundary')) {
        const boundaryChildren = React.Children.toArray((child.props as any).children);
        if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
          actualChild = boundaryChildren[0];
        }
      }

      // Unwrap ResidentDataProvider if present (islands architecture)
      if (typeof actualChild.type === 'function' &&
          (actualChild.type.name === 'ResidentDataProvider' ||
           (actualChild.type as any).displayName === 'ResidentDataProvider')) {
        const providerChildren = React.Children.toArray((actualChild.props as any).children);
        if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
          actualChild = providerChildren[0];
        }
      }

      // Check if this is OnMouseEnter component
      const componentName = typeof actualChild.type === 'function'
        ? (actualChild.type as any).displayName || actualChild.type.name
        : '';

      if (componentName === 'OnMouseEnter') {
        found = actualChild;
      }
    });

    return found;
  }, [children]);

  // P1.4: Memoize handler with useCallback
  const handler = React.useCallback((event?: React.MouseEvent) => {
    if (!onMouseEnterChild) return;
    // The EventDiv, for target="this", as in OnMouseLeave
    const currentElement = event?.currentTarget as HTMLElement | undefined;
    executeActions((onMouseEnterChild as React.ReactElement<OnMouseEnterProps>).props.children, templateState, residentData, forEachContext, currentElement);
  }, [onMouseEnterChild, templateState, residentData, forEachContext]);

  return onMouseEnterChild ? handler : null;
}
