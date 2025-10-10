'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnHover Component - Event handler for hover events (combines mouseenter + mouseleave)
 *
 * Executes action components when the element is hovered.
 * Should be used as a child of hoverable elements.
 *
 * @example
 * ```xml
 * <div>
 *   <OnHover>
 *     <Set var="hovering" value="true" />
 *   </OnHover>
 *   Hover over me!
 * </div>
 * ```
 */

export interface OnHoverProps {
  /** Action components to execute on hover */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnHover(props: OnHoverProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🖱️ OnHover Handler
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-purple-400 dark:border-purple-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing
  // The hover handler is meant to be attached to parent element
  return null;
}

/**
 * Hook to create a hover handler that executes OnHover children
 * Used by parent elements to attach mouseEnter/mouseLeave handlers
 *
 * @param children Component children to search for OnHover
 * @returns Object with onMouseEnter and onMouseLeave handlers
 */
export function useOnHoverHandler(children: React.ReactNode): {
  onMouseEnter: ((event: React.MouseEvent) => void) | null;
  onMouseLeave: ((event: React.MouseEvent) => void) | null;
} {
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // P1.4: Memoize finding OnHover child to avoid repeated traversal
  const onHoverChild = React.useMemo(() => {
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

      // Check if this is OnHover component
      const componentName = typeof actualChild.type === 'function'
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

      if (componentName === 'OnHover') {
        found = actualChild;
      }
    });

    return found;
  }, [children]);

  // P1.4: Memoize handler with useCallback
  const onMouseEnter = React.useCallback((event: React.MouseEvent) => {
    if (!onHoverChild) return;
    // Get the current element from the event for AddClass/RemoveClass target="this"
    const currentElement = event.currentTarget as HTMLElement;
    executeActions(
      (onHoverChild as React.ReactElement<OnHoverProps>).props.children,
      templateState,
      residentData,
      forEachContext,
      currentElement
    );
  }, [onHoverChild, templateState, residentData, forEachContext]);

  // For OnHover, we don't execute anything on mouse leave
  // (use OnMouseEnter/OnMouseLeave for separate control)
  const onMouseLeave = null;

  return onHoverChild ? { onMouseEnter, onMouseLeave } : { onMouseEnter: null, onMouseLeave: null };
}

/**
 * Filter out OnHover from children
 * Used by parent elements to render non-OnHover children
 *
 * @param children Component children
 * @returns Filtered children without OnHover
 */
export function filterOnHoverChildren(children: React.ReactNode): React.ReactNode[] {
  const filtered: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      filtered.push(child);
      return;
    }

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

    // Check if this is OnHover component
    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    // Skip OnHover component
    if (componentName !== 'OnHover') {
      filtered.push(child);
    }
  });

  return filtered;
}
