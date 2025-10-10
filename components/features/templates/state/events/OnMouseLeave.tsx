'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnMouseLeave Component - Event handler for mouse leave events
 *
 * Executes action components when the mouse leaves the element.
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

export interface OnMouseLeaveProps {
  /** Action components to execute on mouse leave */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnMouseLeave(props: OnMouseLeaveProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700 rounded text-xs text-pink-700 dark:text-pink-300 font-mono">
        ⬅️ OnMouseLeave
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-pink-400 dark:border-pink-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing
  return null;
}

/**
 * Hook to create a mouse leave handler
 * Used by parent elements to attach onMouseLeave handlers
 *
 * @param children Component children to search for OnMouseLeave
 * @returns Mouse leave handler function
 */
export function useOnMouseLeaveHandler(children: React.ReactNode): ((event: React.MouseEvent) => void) | null {
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // Find OnMouseLeave child
  let onMouseLeaveChild: React.ReactElement | null = null;

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

    // Check if this is OnMouseLeave component
    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    if (componentName === 'OnMouseLeave') {
      onMouseLeaveChild = actualChild;
    }
  });

  if (!onMouseLeaveChild) {
    return null;
  }

  // Return handler that executes OnMouseLeave's children
  return (event: React.MouseEvent) => {
    // Get the current element from the event for AddClass/RemoveClass target="this"
    const currentElement = event.currentTarget as HTMLElement;
    executeActions(
      (onMouseLeaveChild!.props as OnMouseLeaveProps).children,
      templateState,
      residentData,
      forEachContext,
      currentElement
    );
  };
}
