'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useForEachContext } from './ForEach';

/**
 * Continue Component - Skip to next ForEach iteration
 *
 * Must be used inside a ForEach loop.
 * Skips the rest of the current iteration and moves to the next item.
 *
 * @example Unconditional continue
 * ```xml
 * <ForEach var="items" item="item">
 *   <If condition="item.hidden" equals="true">
 *     <Continue />
 *   </If>
 *   <div>{item.name}</div>
 * </ForEach>
 * ```
 *
 * @example Conditional continue
 * ```xml
 * <ForEach var="items" item="item">
 *   <Continue when="item.hidden === true" />
 *   <div>{item.name}</div>
 * </ForEach>
 * ```
 */

export interface ContinueProps {
  /** Optional condition - continues when true */
  when?: string;

  /** Children (ignored - Continue is an action component) */
  children?: React.ReactNode;
}

export default function Continue(props: ContinueProps) {
  const { when } = props;

  const templateState = useTemplateState();
  const forEachContext = useForEachContext();

  // Normal mode - Continue only works inside OnClick handlers
  // When used directly in templates, it can't prevent subsequent children from rendering
  // IMPORTANT: This hook must be called before any conditional returns
  React.useEffect(() => {
    if (!forEachContext) {
      return;
    }

    console.warn('[Continue] Continue component should only be used inside OnClick handlers. Direct template usage is not supported because React cannot prevent subsequent children from rendering.');
  }, [forEachContext]);

  return null;
}

/**
 * Execute Continue action programmatically
 * Called by event handlers like OnClick
 *
 * @param props Continue component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context
 */
export function executeContinueAction(
  props: ContinueProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext: ReturnType<typeof useForEachContext>
): void {
  if (!forEachContext) {
    console.warn('[Continue] Continue component must be used inside a ForEach loop');
    return;
  }

  const { when } = props;

  // If there's a condition, evaluate it
  if (when) {
    try {
      // For now, simple evaluation - just check if variable is truthy
      // In future, could integrate with condition-evaluator
      const shouldContinue = when === 'true';

      if (shouldContinue) {
        forEachContext.setContinue();
      }
    } catch (error) {
      console.error('[Continue] Error evaluating condition:', error);
    }
  } else {
    // Unconditional continue
    forEachContext.setContinue();
  }
}
