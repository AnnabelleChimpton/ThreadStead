'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
// QUICK WIN #3: Use centralized ActionExecutor instead of duplicate logic
import { executeActions } from '@/lib/templates/state/ActionExecutor';
import { eventMarker, useElementEvent } from './element-events';

/**
 * OnClick Component - Event handler for click events
 *
 * Executes action components (Set, Increment, etc.) when clicked. Inside a
 * Button, the Button runs it (useOnClickHandler). Anywhere else it runs on
 * a click on the element it sits in, or with target on the page's elements
 * matching the selector, which become buttons for the keyboard too
 * (element-events.tsx). In its actions, target="this" is what was clicked.
 *
 * @example
 * ```xml
 * <div class="card">
 *   <OnClick>
 *     <Set var="counter" expression="$vars.counter + 1" />
 *   </OnClick>
 *   Click me!
 * </div>
 *
 * <img id="cat" src="cat.png" alt="Pet the cat">
 * <OnClick target="#cat"><Increment var="pets" /></OnClick>
 * ```
 */

export interface OnClickProps {
  /** Action components to execute (Set, Increment, etc.) */
  children?: React.ReactNode;

  /** A selector for the page elements to click, instead of the element it sits in */
  target?: string;
}

export default function OnClick(props: OnClickProps) {
  const { children, target } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  const marker = useElementEvent('click', target, (element) => {
    executeActions(children, templateState, residentData, forEachContext, element);
  });

  // Not inside a Button: a marker for finding the element it sits in
  return eventMarker(marker);
}

/**
 * QUICK WIN #3: executeActions has been moved to ActionExecutor utility
 * @see lib/templates/state/ActionExecutor.ts
 *
 * This function was ~240 lines and duplicated across multiple event handlers.
 * Now centralized for O(1) action lookup via Map-based registry.
 *
 * The executeActions function is imported from ActionExecutor at the top of this file.
 */

// Legacy export for backward compatibility (though this is the new implementation)
export { executeActions } from '@/lib/templates/state/ActionExecutor';

/**
 * Hook to create a click handler that executes OnClick children
 * Used by parent elements (buttons, etc.) to attach click handlers
 *
 * @param children Component children to search for OnClick
 * @returns Click handler function
 */
export function useOnClickHandler(children: React.ReactNode): ((event?: React.MouseEvent) => void) | null {
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // P1.4: Memoize finding OnClick child to avoid repeated traversal
  const onClickChild = React.useMemo(() => {
    let found: React.ReactElement | null = null;

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const originalChildType = typeof child.type === 'function' ? ((child.type as any).displayName || child.type.name) : String(child.type);

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

      // Check if this is OnClick component
      const componentName = typeof actualChild.type === 'function'
        ? (actualChild.type as any).displayName || actualChild.type.name
        : '';

      // One with a target clicks that instead, and renders itself
      if (componentName === 'OnClick' && !(actualChild.props as OnClickProps).target) {
        found = actualChild;
      }
    });

    return found;
  }, [children]);

  // P1.4: Memoize handler with useCallback
  const handler = React.useCallback((event?: React.MouseEvent) => {
    if (!onClickChild) return;
    // The button itself, for target="this"
    const currentElement = event?.currentTarget as HTMLElement | undefined;
    executeActions((onClickChild as React.ReactElement<OnClickProps>).props.children, templateState, residentData, forEachContext, currentElement);
  }, [onClickChild, templateState, residentData, forEachContext]);

  return onClickChild ? handler : null;
}

/**
 * Filter out OnClick from children
 * Used by parent elements to render non-OnClick children
 *
 * @param children Component children
 * @returns Children without OnClick elements
 */
export function filterOnClickChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.toArray(children).filter((child) => {
    if (!React.isValidElement(child)) return true;

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

    const componentName = typeof actualChild.type === 'function'
      ? (actualChild.type as any).displayName || actualChild.type.name
      : '';

    return componentName !== 'OnClick' || Boolean((actualChild.props as OnClickProps).target);
  });
}
