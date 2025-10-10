'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnChange Component - Event handler for input change events
 *
 * Executes action components when input value changes.
 * Should be used as a child of input elements (Input, Slider, etc.).
 *
 * @example
 * ```xml
 * <Input var="searchQuery">
 *   <OnChange>
 *     <Set var="isSearching" value="true" />
 *   </OnChange>
 * </Input>
 * ```
 *
 * Note: OnChange renders nothing and expects parent components to use useOnChangeHandler hook.
 */

export interface OnChangeProps {
  /** Action components to execute (Set, Increment, etc.) */
  children?: React.ReactNode;

  /** Optional debounce time in milliseconds */
  debounce?: number;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnChange(props: OnChangeProps) {
  const {
    children,
    debounce,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
        🔄 OnChange Handler {debounce ? `(${debounce}ms debounce)` : ''}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-blue-400 dark:border-blue-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing
  // The change handler is meant to be attached to parent element
  return null;
}

/**
 * Hook to create a change handler that executes OnChange children
 * Used by input components (Input, Slider, etc.) to attach change handlers
 *
 * @param children Component children to search for OnChange
 * @returns Change handler function
 */
export function useOnChangeHandler(children: React.ReactNode): ((value?: any) => void) | null {
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // Use refs to capture current values for use in debounced callbacks
  const templateStateRef = React.useRef(templateState);
  const residentDataRef = React.useRef(residentData);
  const forEachContextRef = React.useRef(forEachContext);

  React.useEffect(() => {
    templateStateRef.current = templateState;
    residentDataRef.current = residentData;
    forEachContextRef.current = forEachContext;
  }, [templateState, residentData, forEachContext]);

  // P1.4: Memoize finding OnChange child to avoid repeated traversal
  const onChangeChild = React.useMemo(() => {
    let found: React.ReactElement<OnChangeProps> | null = null;

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

      // Check if this is OnChange component
      const componentName = typeof actualChild.type === 'function'
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

      if (componentName === 'OnChange') {
        found = actualChild as React.ReactElement<OnChangeProps>;
      }
    });

    return found;
  }, [children]);

  // Use ref to persist timeout ID across renders
  const timeoutIdRef = React.useRef<NodeJS.Timeout | null>(null);

  // Return handler that executes OnChange's children
  const handler = React.useCallback((value?: any) => {
    if (!onChangeChild) {
      return;
    }

    const props = (onChangeChild as React.ReactElement<OnChangeProps>).props;
    const debounce = props.debounce || 0;
    if (debounce > 0) {
      // Debounced version - use refs to get current state
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      timeoutIdRef.current = setTimeout(() => {
        console.log('[OnChange] Executing debounced actions after', debounce, 'ms');
        executeActions(props.children, templateStateRef.current, residentDataRef.current, forEachContextRef.current);
      }, debounce);
    } else {
      // Immediate version
      executeActions(props.children, templateState, residentData, forEachContext);
    }
  }, [onChangeChild, templateState, residentData, forEachContext]);
  // Note: templateState/residentData/forEachContext changes will recreate handler, but that's okay
  // The important part is debounce value staying stable

  return onChangeChild ? handler : null;
}

/**
 * Filter out OnChange from children
 * Used by parent elements to render non-OnChange children
 *
 * @param children Component children
 * @returns Children without OnChange elements
 */
export function filterOnChangeChildren(children: React.ReactNode): React.ReactNode {
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

    return componentName !== 'OnChange';
  });
}
