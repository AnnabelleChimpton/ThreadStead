'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { countArray } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Count Component - Action to count array items
 *
 * Counts all items in an array, or counts items matching a condition.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to count array elements. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Count all items -->
 * <Button>
 *   <OnClick>
 *     <Count var="items" target="totalCount" />
 *   </OnClick>
 *   Count All Items
 * </Button>
 *
 * <!-- Count matching items -->
 * <Button>
 *   <OnClick>
 *     <Count var="items" target="activeCount" where="item.active === true" />
 *   </OnClick>
 *   Count Active Items
 * </Button>
 * ```
 */

export interface CountProps {
  /** Source array variable name */
  var: string;

  /** Target variable name to store count */
  target: string;

  /** Optional condition expression to filter items (e.g., "item.active === true") */
  where?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Count is an action component) */
  children?: React.ReactNode;
}

export default function Count(props: CountProps) {
  const {
    var: varName,
    target,
    where,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded text-xs text-indigo-700 dark:text-indigo-300 font-mono">
        🔢 Count: {varName} → {target}
        {where && <span className="ml-1 text-indigo-500">where {where}</span>}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Count action
 * Called by event handlers (OnClick, etc.)
 */
export function executeCountAction(
  props: CountProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target, where } = props;

  // Validate required props
  if (!varName || !target) {
    console.error('[Count] Missing required props: var and target are required');
    return;
  }

  // CRITICAL: Read from global manager instead of React state
  // This ensures we get the latest value from chained operations
  const variableValue = globalTemplateStateManager.getVariable(varName);

  // Check if variable exists
  if (variableValue === undefined || variableValue === null) {
    console.warn(`[Count] Variable "${varName}" not found`);
    return;
  }

  const sourceArray = Array.isArray(variableValue) ? variableValue : [];

  // Build context with FRESH variables from global manager
  const freshVariables = globalTemplateStateManager.getAllVariables();
  const context: Record<string, any> = {};
  Object.keys(freshVariables).forEach(key => {
    context[key] = freshVariables[key].value;
  });

  try {
    // Count items (with optional filter)
    const count = countArray(sourceArray, where, context);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: 'number',
        initial: count
      });
    }

    // Update target variable
    templateState.setVariable(target, count);
  } catch (error) {
    console.error('[Count] Failed to count array:', error);
  }
}
