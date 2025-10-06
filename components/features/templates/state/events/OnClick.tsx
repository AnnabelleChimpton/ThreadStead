'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { executeSetAction } from '../actions/Set';
import { executeIncrementAction } from '../actions/Increment';
import { executeDecrementAction } from '../actions/Decrement';
import { executeToggleAction } from '../actions/Toggle';
import { executeShowToastAction } from '../actions/ShowToast';
import { evaluateIfCondition } from '../conditional/If';
import { evaluateElseIfCondition } from '../conditional/ElseIf';

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

    executeActions(children, templateState, residentData);
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
 * Execute action components
 * Iterates through children and executes recognized actions
 * Supports conditional chains (If/ElseIf/Else)
 *
 * @param children React children (action components)
 * @param templateState Template state context
 * @param residentData Resident data for condition evaluation
 */
export function executeActions(
  children: React.ReactNode,
  templateState: ReturnType<typeof useTemplateState>,
  residentData: any
): void {
  const childArray = React.Children.toArray(children);

  // Track conditional chain state
  let inConditionalChain = false;
  let conditionMatched = false;

  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (!React.isValidElement(child)) continue;

    // Unwrap ResidentDataProvider if present (islands architecture)
    let actualChild = child;
    if (typeof child.type === 'function' &&
        (child.type.name === 'ResidentDataProvider' ||
         (child.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((child.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    // Get component name
    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : typeof actualChild.type === 'string'
        ? actualChild.type
        : '';

    // Handle conditional components (If/ElseIf/Else)
    if (componentName === 'If') {
      inConditionalChain = true;
      conditionMatched = evaluateIfCondition(actualChild.props as any, residentData);
      if (conditionMatched) {
        executeActions((actualChild.props as any).children, templateState, residentData);
      }
      continue;
    }

    if (componentName === 'ElseIf' && inConditionalChain) {
      if (!conditionMatched) {
        conditionMatched = evaluateElseIfCondition(actualChild.props as any, residentData);
        if (conditionMatched) {
          executeActions((actualChild.props as any).children, templateState, residentData);
        }
      }
      continue;
    }

    if (componentName === 'Else' && inConditionalChain) {
      if (!conditionMatched) {
        executeActions((actualChild.props as any).children, templateState, residentData);
      }
      inConditionalChain = false;
      conditionMatched = false;
      continue;
    }

    // Any other component ends the conditional chain
    if (inConditionalChain && !['If', 'ElseIf', 'Else'].includes(componentName)) {
      inConditionalChain = false;
      conditionMatched = false;
    }

    // Execute regular action components
    if (componentName === 'Set') {
      executeSetAction(actualChild.props as import('../actions/Set').SetProps, templateState);
    }
    else if (componentName === 'Increment') {
      executeIncrementAction(actualChild.props as import('../actions/Increment').IncrementProps, templateState);
    }
    else if (componentName === 'Decrement') {
      executeDecrementAction(actualChild.props as import('../actions/Decrement').DecrementProps, templateState);
    }
    else if (componentName === 'Toggle') {
      executeToggleAction(actualChild.props as import('../actions/Toggle').ToggleProps, templateState);
    }
    else if (componentName === 'ShowToast') {
      executeShowToastAction(actualChild.props as import('../actions/ShowToast').ShowToastProps, templateState);
    }
    // Ignore conditional components (already handled above)
    else if (!['If', 'ElseIf', 'Else'].includes(componentName)) {
      console.warn(`OnClick: Unknown action component "${componentName}"`);
    }
  }
}

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

  // Find OnClick child
  let onClickChild: React.ReactElement | null = null;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    // Unwrap ResidentDataProvider if present (islands architecture)
    let actualChild = child;
    if (typeof child.type === 'function' &&
        (child.type.name === 'ResidentDataProvider' ||
         (child.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((child.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    // Check if this is OnClick component
    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    if (componentName === 'OnClick') {
      onClickChild = actualChild;
    }
  });

  if (!onClickChild) {
    return null;
  }

  // Return handler that executes OnClick's children
  return () => {
    executeActions((onClickChild!.props as OnClickProps).children, templateState, residentData);
  };
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

    // Unwrap ResidentDataProvider if present (islands architecture)
    let actualChild = child;
    if (typeof child.type === 'function' &&
        (child.type.name === 'ResidentDataProvider' ||
         (child.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((child.props as any).children);
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
