'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeSetAction } from '../actions/Set';
import { executeIncrementAction } from '../actions/Increment';
import { executeDecrementAction } from '../actions/Decrement';
import { executeToggleAction } from '../actions/Toggle';
import { executeShowToastAction } from '../actions/ShowToast';
import { executePushAction } from '../actions/Push';
import { executePopAction } from '../actions/Pop';
import { executeRemoveAtAction } from '../actions/RemoveAt';
import { executeAppendAction } from '../actions/Append';
import { executePrependAction } from '../actions/Prepend';
import { executeCycleAction } from '../actions/Cycle';
import { executeAddClassAction } from '../actions/AddClass';
import { executeRemoveClassAction } from '../actions/RemoveClass';
import { executeToggleClassAction } from '../actions/ToggleClass';
import { executeSetCSSVarAction } from '../actions/SetCSSVar';
import { executeCopyToClipboardAction } from '../actions/CopyToClipboard';
import { executeSetURLParamAction } from '../actions/SetURLParam';
import { executeSetURLHashAction } from '../actions/SetURLHash';
import { executeResetAction } from '../actions/Reset';
// Phase 2 (Roadmap): Collection operations
import { executeCountAction } from '../actions/Count';
import { executeSumAction } from '../actions/Sum';
import { executeGetAction } from '../actions/Get';
import { executeFilterAction } from '../actions/Filter';
import { executeFindAction } from '../actions/Find';
import { executeTransformAction } from '../actions/Transform';
import { executeSortAction } from '../actions/Sort';
import { evaluateIfCondition } from '../conditional/If';
import { evaluateElseIfCondition } from '../conditional/ElseIf';
import { executeSwitchActions } from '../conditional/Switch';
// Phase 3 (Roadmap): Temporal controls
import { executeDelayAction } from '../temporal/Delay';
import { executeSequenceActions } from '../temporal/Sequence';
import { executeContinueAction } from '../loops/Continue';
// Phase 6 (Roadmap): Advanced state management
import { executeCloneAction } from '../actions/Clone';
import { executeMergeAction } from '../actions/Merge';
import { executeObjectSetAction } from '../actions/ObjectSet';
import { executeExtractAction } from '../actions/Extract';
import { executeConditionalAttrAction } from '../actions/ConditionalAttr';

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
 * Execute action components
 * Iterates through children and executes recognized actions
 * Supports conditional chains (If/ElseIf/Else)
 *
 * @param children React children (action components)
 * @param templateState Template state context
 * @param residentData Resident data for condition evaluation
 * @param forEachContext ForEach loop context (if inside ForEach)
 * @param currentElement Current HTML element (for target="this" in AddClass/RemoveClass)
 */
export function executeActions(
  children: React.ReactNode,
  templateState: ReturnType<typeof useTemplateState>,
  residentData: any,
  forEachContext: ReturnType<typeof useForEachContext> = null,
  currentElement?: HTMLElement
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
      conditionMatched = evaluateIfCondition(actualChild.props as any, residentData, forEachContext);
      if (conditionMatched) {
        executeActions((actualChild.props as any).children, templateState, residentData, forEachContext, currentElement);
      }
      continue;
    }

    if (componentName === 'ElseIf' && inConditionalChain) {
      if (!conditionMatched) {
        conditionMatched = evaluateElseIfCondition(actualChild.props as any, residentData, forEachContext);
        if (conditionMatched) {
          executeActions((actualChild.props as any).children, templateState, residentData, forEachContext, currentElement);
        }
      }
      continue;
    }

    if (componentName === 'Else' && inConditionalChain) {
      if (!conditionMatched) {
        executeActions((actualChild.props as any).children, templateState, residentData, forEachContext, currentElement);
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

    // Handle Switch/Case/Default pattern matching
    if (componentName === 'Switch') {
      // Execute Switch actions using the helper function
      executeSwitchActions(
        actualChild.props as any,
        templateState,
        residentData,
        forEachContext,
        executeActions
      );
      continue;
    }

    // Handle Delay (temporal control)
    if (componentName === 'Delay') {
      // Execute delay asynchronously (doesn't block subsequent actions)
      executeDelayAction(
        actualChild.props as any,
        executeActions,
        templateState,
        residentData,
        forEachContext,
        currentElement
      ).catch(error => {
        console.error('[OnClick] Delay execution error:', error);
      });
      continue;
    }

    // Handle Sequence (temporal control)
    if (componentName === 'Sequence') {
      // Execute sequence asynchronously (doesn't block subsequent actions)
      executeSequenceActions(
        actualChild.props as any,
        executeActions,
        templateState,
        residentData,
        forEachContext,
        currentElement
      ).catch(error => {
        console.error('[OnClick] Sequence execution error:', error);
      });
      continue;
    }

    // Execute regular action components
    try {
      if (componentName === 'Set') {
        executeSetAction(actualChild.props as import('../actions/Set').SetProps, templateState, forEachContext);
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
      // Array actions
      else if (componentName === 'Push') {
        executePushAction(actualChild.props as import('../actions/Push').PushProps, templateState);
      }
      else if (componentName === 'Pop') {
        executePopAction(actualChild.props as import('../actions/Pop').PopProps, templateState);
      }
      else if (componentName === 'RemoveAt') {
        console.log('[OnClick] Executing RemoveAt with props:', actualChild.props);
        executeRemoveAtAction(actualChild.props as import('../actions/RemoveAt').RemoveAtProps, templateState, forEachContext);
      }
      // String actions
      else if (componentName === 'Append') {
        executeAppendAction(actualChild.props as import('../actions/Append').AppendProps, templateState);
      }
      else if (componentName === 'Prepend') {
        executePrependAction(actualChild.props as import('../actions/Prepend').PrependProps, templateState);
      }
      // Cycle action
      else if (componentName === 'Cycle') {
        executeCycleAction(actualChild.props as import('../actions/Cycle').CycleProps, templateState);
      }
      // CSS manipulation actions
      else if (componentName === 'AddClass') {
        executeAddClassAction(actualChild.props as import('../actions/AddClass').AddClassProps, currentElement);
      }
      else if (componentName === 'RemoveClass') {
        executeRemoveClassAction(actualChild.props as import('../actions/RemoveClass').RemoveClassProps, currentElement);
      }
      else if (componentName === 'ToggleClass') {
        executeToggleClassAction(actualChild.props as import('../actions/ToggleClass').ToggleClassProps, currentElement);
      }
      else if (componentName === 'SetCSSVar') {
        executeSetCSSVarAction(actualChild.props as import('../actions/SetCSSVar').SetCSSVarProps, templateState, forEachContext);
      }
      // Utility actions
      else if (componentName === 'CopyToClipboard') {
        executeCopyToClipboardAction(actualChild.props as import('../actions/CopyToClipboard').CopyToClipboardProps, templateState, forEachContext);
      }
      else if (componentName === 'SetURLParam') {
        executeSetURLParamAction(actualChild.props as import('../actions/SetURLParam').SetURLParamProps, templateState, forEachContext);
      }
      else if (componentName === 'SetURLHash') {
        executeSetURLHashAction(actualChild.props as import('../actions/SetURLHash').SetURLHashProps, templateState, forEachContext);
      }
      else if (componentName === 'Reset') {
        executeResetAction(actualChild.props as import('../actions/Reset').ResetProps, templateState);
      }
      // Phase 2 (Roadmap): Collection operations
      else if (componentName === 'Count') {
        executeCountAction(actualChild.props as import('../actions/Count').CountProps, templateState);
      }
      else if (componentName === 'Sum') {
        executeSumAction(actualChild.props as import('../actions/Sum').SumProps, templateState);
      }
      else if (componentName === 'Get') {
        executeGetAction(actualChild.props as import('../actions/Get').GetProps, templateState);
      }
      else if (componentName === 'Filter') {
        executeFilterAction(actualChild.props as import('../actions/Filter').FilterProps, templateState);
      }
      else if (componentName === 'Find') {
        executeFindAction(actualChild.props as import('../actions/Find').FindProps, templateState);
      }
      else if (componentName === 'Transform') {
        executeTransformAction(actualChild.props as import('../actions/Transform').TransformProps, templateState);
      }
      else if (componentName === 'Sort') {
        executeSortAction(actualChild.props as import('../actions/Sort').SortProps, templateState);
      }
      // Phase 6 (Roadmap): Advanced state management
      else if (componentName === 'Clone') {
        executeCloneAction(actualChild.props as import('../actions/Clone').CloneProps, templateState);
      }
      else if (componentName === 'Merge') {
        executeMergeAction(actualChild.props as import('../actions/Merge').MergeProps, templateState);
      }
      else if (componentName === 'ObjectSet') {
        executeObjectSetAction(actualChild.props as import('../actions/ObjectSet').ObjectSetProps, templateState, forEachContext);
      }
      else if (componentName === 'Extract') {
        executeExtractAction(actualChild.props as import('../actions/Extract').ExtractProps, templateState);
      }
      else if (componentName === 'ConditionalAttr') {
        executeConditionalAttrAction(actualChild.props as import('../actions/ConditionalAttr').ConditionalAttrProps, residentData, forEachContext);
      }
      // Phase 3 (Roadmap): Loop control
      else if (componentName === 'Break') {
        console.warn('[OnClick] Break component is not supported inside OnClick handlers. Break is a passive marker component that is pre-processed by ForEach during template rendering.');
      }
      else if (componentName === 'Continue') {
        executeContinueAction(actualChild.props as import('../loops/Continue').ContinueProps, templateState, forEachContext);
      }
      // Ignore conditional components (already handled above)
      else if (!['If', 'ElseIf', 'Else'].includes(componentName)) {
        console.warn(`OnClick: Unknown action component "${componentName}"`);
      }
    } catch (error) {
      console.error(`[OnClick] Error executing ${componentName}:`, error);
      console.error('[OnClick] Props were:', actualChild.props);
      // Continue execution despite error
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
  const forEachContext = useForEachContext();

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
    executeActions((onClickChild!.props as OnClickProps).children, templateState, residentData, forEachContext);
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
