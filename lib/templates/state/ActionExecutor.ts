/**
 * QUICK WIN #3: Action Executor Utility
 *
 * Centralized action execution logic with O(1) lookup via Map-based registry.
 * Replaces O(n) string comparison in OnClick and other event handlers.
 *
 * Eliminates ~1200 lines of duplicate code across event handlers:
 * - OnClick.tsx
 * - OnChange.tsx
 * - OnMount.tsx
 * - OnInterval.tsx
 * - OnHover.tsx
 * - OnKeyPress.tsx
 * - OnVisible.tsx
 * - OnMouseEnter.tsx
 * - OnMouseLeave.tsx
 */

import React from 'react';
import type { useTemplateState } from './TemplateStateProvider';
import { evaluateIfCondition } from '@/components/features/templates/state/conditional/If';
import { evaluateElseIfCondition } from '@/components/features/templates/state/conditional/ElseIf';
import { executeSwitchActions } from '@/components/features/templates/state/conditional/Switch';

// Import all action executors
import { executeSetAction } from '@/components/features/templates/state/actions/Set';
import { executeIncrementAction } from '@/components/features/templates/state/actions/Increment';
import { executeDecrementAction } from '@/components/features/templates/state/actions/Decrement';
import { executeToggleAction } from '@/components/features/templates/state/actions/Toggle';
import { executeShowToastAction } from '@/components/features/templates/state/actions/ShowToast';
import { executePushAction } from '@/components/features/templates/state/actions/Push';
import { executePopAction } from '@/components/features/templates/state/actions/Pop';
import { executeRemoveAtAction } from '@/components/features/templates/state/actions/RemoveAt';
import { executeAppendAction } from '@/components/features/templates/state/actions/Append';
import { executePrependAction } from '@/components/features/templates/state/actions/Prepend';
import { executeCycleAction } from '@/components/features/templates/state/actions/Cycle';
import { executeAddClassAction } from '@/components/features/templates/state/actions/AddClass';
import { executeRemoveClassAction } from '@/components/features/templates/state/actions/RemoveClass';
import { executeToggleClassAction } from '@/components/features/templates/state/actions/ToggleClass';
import { executeSetCSSVarAction } from '@/components/features/templates/state/actions/SetCSSVar';
import { executeCopyToClipboardAction } from '@/components/features/templates/state/actions/CopyToClipboard';
import { executeSetURLParamAction } from '@/components/features/templates/state/actions/SetURLParam';
import { executeSetURLHashAction } from '@/components/features/templates/state/actions/SetURLHash';
import { executeResetAction } from '@/components/features/templates/state/actions/Reset';
import { executeCountAction } from '@/components/features/templates/state/actions/Count';
import { executeSumAction } from '@/components/features/templates/state/actions/Sum';
import { executeGetAction } from '@/components/features/templates/state/actions/Get';
import { executeFilterAction } from '@/components/features/templates/state/actions/Filter';
import { executeFindAction } from '@/components/features/templates/state/actions/Find';
import { executeTransformAction } from '@/components/features/templates/state/actions/Transform';
import { executeSortAction } from '@/components/features/templates/state/actions/Sort';
import { executeDelayAction } from '@/components/features/templates/state/temporal/Delay';
import { executeSequenceActions } from '@/components/features/templates/state/temporal/Sequence';
import { executeContinueAction } from '@/components/features/templates/state/loops/Continue';
import { executeCloneAction } from '@/components/features/templates/state/actions/Clone';
import { executeMergeAction } from '@/components/features/templates/state/actions/Merge';
import { executeObjectSetAction } from '@/components/features/templates/state/actions/ObjectSet';
import { executeExtractAction } from '@/components/features/templates/state/actions/Extract';
import { executeConditionalAttrAction } from '@/components/features/templates/state/actions/ConditionalAttr';

/** Everything an action can be given, from its event handler */
interface ActionCall {
  props: any;
  templateState: ReturnType<typeof useTemplateState>;
  residentData: any;
  forEachContext?: any;
  currentElement?: HTMLElement;
}

type ActionExecutorFn = (call: ActionCall) => void | Promise<void>;

/*
 * Actions take what they use, in one of three orders. Every one used to be
 * called (props, templateState, residentData, forEachContext, element), so
 * inside a ForEach most got residentData as their loop (RemoveAt did
 * nothing: the shipped "Cross one off" lesson), and the class actions got
 * the template state as their element ("this" never worked) (template
 * audit 06 #1).
 */
// State, list and text actions: (props, templateState, forEachContext)
const withState = (fn: (props: any, templateState: any, forEachContext?: any) => void | Promise<void>): ActionExecutorFn =>
  (call) => fn(call.props, call.templateState, call.forEachContext);
// Class actions: (props, the element the event happened on), once React has
// drawn what the same click changed: a <Set> that shows an element, then an
// <AddClass> for it, found nothing (template audit 06 §3)
const onElement = (fn: (props: any, currentElement?: HTMLElement) => void): ActionExecutorFn =>
  (call) => {
    const run = () => fn(call.props, call.currentElement);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  };

/**
 * Action registry for O(1) lookup
 * Maps component name to executor function
 */
const actionRegistry = new Map<string, ActionExecutorFn>([
  // Basic state actions
  ['Set', withState(executeSetAction)],
  ['Increment', withState(executeIncrementAction)],
  ['Decrement', withState(executeDecrementAction)],
  ['Toggle', withState(executeToggleAction)],
  ['ShowToast', withState(executeShowToastAction)],
  ['Reset', withState(executeResetAction)],

  // Array actions
  ['Push', withState(executePushAction)],
  ['Pop', withState(executePopAction)],
  ['RemoveAt', withState(executeRemoveAtAction)],

  // String actions
  ['Append', withState(executeAppendAction)],
  ['Prepend', withState(executePrependAction)],

  // Cycle action
  ['Cycle', withState(executeCycleAction)],

  // CSS manipulation actions
  ['AddClass', onElement(executeAddClassAction)],
  ['RemoveClass', onElement(executeRemoveClassAction)],
  ['ToggleClass', onElement(executeToggleClassAction)],
  ['SetCSSVar', withState(executeSetCSSVarAction)],

  // Utility actions
  ['CopyToClipboard', withState(executeCopyToClipboardAction)],
  ['SetURLParam', withState(executeSetURLParamAction)],
  ['SetURLHash', withState(executeSetURLHashAction)],

  // Collection operations
  ['Count', withState(executeCountAction)],
  ['Sum', withState(executeSumAction)],
  ['Get', withState(executeGetAction)],
  ['Filter', withState(executeFilterAction)],
  ['Find', withState(executeFindAction)],
  ['Transform', withState(executeTransformAction)],
  ['Sort', withState(executeSortAction)],

  // Loop control
  ['Continue', withState(executeContinueAction)],

  // Advanced state management
  ['Clone', withState(executeCloneAction)],
  ['Merge', withState(executeMergeAction)],
  ['ObjectSet', withState(executeObjectSetAction)],
  ['Extract', withState(executeExtractAction)],
  ['ConditionalAttr', (call) => executeConditionalAttrAction(call.props, call.residentData, call.forEachContext)],
]);

/**
 * Execute action components from children
 *
 * Iterates through children and executes recognized actions using O(1) Map lookup.
 * Supports conditional chains (If/ElseIf/Else) and Switch/Case/Default patterns.
 *
 * @param children React children (action components)
 * @param templateState Template state context
 * @param residentData Resident data for condition evaluation
 * @param forEachContext ForEach loop context (if inside ForEach)
 * @param currentElement Current HTML element (for target="this" in CSS actions)
 */
export function executeActions(
  children: React.ReactNode,
  templateState: ReturnType<typeof useTemplateState>,
  residentData: any,
  forEachContext: any = null,
  currentElement?: HTMLElement
): void {
  const childArray = React.Children.toArray(children);

  // Track conditional chain state
  let inConditionalChain = false;
  let conditionMatched = false;

  for (const child of childArray) {
    if (!React.isValidElement(child)) continue;

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

    // BUG FIX: Unwrap ResidentDataProvider if present (islands architecture)
    // This was previously done in getComponentName but actualChild wasn't returned
    if (typeof actualChild.type === 'function' &&
        (actualChild.type.name === 'ResidentDataProvider' ||
         (actualChild.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((actualChild.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    // Get component name from actualChild (not child!)
    const componentName = typeof actualChild.type === 'function'
      ? (actualChild.type as any).displayName || actualChild.type.name
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
      executeSwitchActions(
        actualChild.props as any,
        templateState,
        residentData,
        forEachContext,
        executeActions
      );
      continue;
    }

    // Handle Delay (temporal control - asynchronous)
    if (componentName === 'Delay') {
      executeDelayAction(
        actualChild.props as any,
        executeActions,
        templateState,
        residentData,
        forEachContext,
        currentElement
      ).catch(error => {
        console.error('[ActionExecutor] Delay execution error:', error);
      });
      continue;
    }

    // Handle Sequence (temporal control - asynchronous)
    if (componentName === 'Sequence') {
      executeSequenceActions(
        actualChild.props as any,
        executeActions,
        templateState,
        residentData,
        forEachContext,
        currentElement
      ).catch(error => {
        console.error('[ActionExecutor] Sequence execution error:', error);
      });
      continue;
    }

    // Handle Break (not supported in action sequences)
    if (componentName === 'Break') {
      console.warn('[ActionExecutor] Break component is not supported inside event handlers. Break is a passive marker component that is pre-processed by ForEach during template rendering.');
      continue;
    }

    // Execute action using registry (O(1) lookup)
    const executor = actionRegistry.get(componentName);
    if (executor) {
      try {
        executor({ props: actualChild.props, templateState, residentData, forEachContext, currentElement });
      } catch (error) {
        console.error(`[ActionExecutor] Error executing ${componentName}:`, error);
        console.error('[ActionExecutor] Props were:', actualChild.props);
        // Continue execution despite error
      }
    } else if (!['If', 'ElseIf', 'Else'].includes(componentName)) {
      // Only warn about unknown components if they're not conditionals
      console.warn(`[ActionExecutor] Unknown action component "${componentName}"`);
    }
  }
}

/**
 * Register a custom action executor
 * Allows extending the action system with custom actions
 *
 * Note: Executors can have any signature. When called, they receive:
 * (props, templateState, residentData, forEachContext, currentElement)
 * Your executor can use whichever parameters it needs and ignore the rest.
 *
 * @param componentName Name of the action component
 * @param executor Function to execute the action
 *
 * @example
 * registerAction('MyCustomAction', ({ props, templateState }) => {
 *   templateState.setVariable(props.var, props.value);
 * });
 */
export function registerAction(componentName: string, executor: ActionExecutorFn): void {
  if (actionRegistry.has(componentName)) {
    console.warn(`[ActionExecutor] Overwriting existing action: ${componentName}`);
  }
  actionRegistry.set(componentName, executor);
}

/**
 * Unregister a custom action executor
 *
 * @param componentName Name of the action component to remove
 */
export function unregisterAction(componentName: string): void {
  actionRegistry.delete(componentName);
}

/**
 * Get list of all registered action names
 * Useful for debugging and documentation
 */
export function getRegisteredActions(): string[] {
  return Array.from(actionRegistry.keys());
}
