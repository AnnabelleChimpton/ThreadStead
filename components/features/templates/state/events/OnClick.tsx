'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
// QUICK WIN #3: Use centralized ActionExecutor instead of duplicate logic
import { executeActions } from '@/lib/templates/state/ActionExecutor';

/**
 * OnClick Component - Event handler for click events
 *
 * Executes action components (Set, Increment, etc.) when clicked.
 * Should be used as a child of clickable elements like buttons.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Set var="counter" expression="$vars.counter + 1" />
 *   </OnClick>
 *   Click me!
 * </button>
 * ```
 *
 * Note: In the current implementation, OnClick creates a wrapper element.
 * Future versions may integrate more seamlessly with parent elements.
 */

export interface OnClickProps {
  /** Action components to execute (Set, Increment, etc.) */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

// Context for event handler (future enhancement)
interface EventHandlerContextType {
  registerClickHandler?: (handler: () => void) => void;
}

const EventHandlerContext = createContext<EventHandlerContextType>({});

export default function OnClick(props: OnClickProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  /**
   * Execute all action children
   */
  const handleClick = (event: React.MouseEvent) => {
    // Don't execute in visual builder mode
    if (isVisualBuilder) {
      event.preventDefault();
      return;
    }

    executeActions(children, templateState, residentData, forEachContext);
  };

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300 font-mono">
        👆 OnClick Handler
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-green-400 dark:border-green-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing
  // The click handler is meant to be attached to parent element
  // For MVP, we'll handle this via parent element detection
  return null;
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
export function useOnClickHandler(children: React.ReactNode): (() => void) | null {
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

      const originalChildType = typeof child.type === 'function' ? (child.type.name || (child.type as any).displayName) : String(child.type);

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
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

      if (componentName === 'OnClick') {
        found = actualChild;
      }
    });

    return found;
  }, [children]);

  // P1.4: Memoize handler with useCallback
  const handler = React.useCallback(() => {
    if (!onClickChild) return;
    executeActions((onClickChild as React.ReactElement<OnClickProps>).props.children, templateState, residentData, forEachContext);
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
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    return componentName !== 'OnClick';
  });
}
