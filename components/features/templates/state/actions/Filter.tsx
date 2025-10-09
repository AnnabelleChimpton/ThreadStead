'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { filterArray } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Filter Component - Action to filter array by condition
 *
 * Filters array items based on a condition expression, creating a new array with matching items.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to filter arrays. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Filter active items -->
 * <Button>
 *   <OnClick>
 *     <Filter var="items" target="activeItems" where="item.status === 'active'" />
 *   </OnClick>
 *   Show Active Items
 * </Button>
 *
 * <!-- Filter by numeric condition -->
 * <Button>
 *   <OnClick>
 *     <Filter var="products" target="expensive" where="item.price > 100" />
 *   </OnClick>
 *   Show Expensive Products
 * </Button>
 * ```
 */

export interface FilterProps {
  /** Source array variable name */
  var: string;

  /** Target variable name to store filtered array */
  target: string;

  /** Condition expression (has access to 'item' and 'index') */
  where: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Filter is an action component) */
  children?: React.ReactNode;
}

export default function Filter(props: FilterProps) {
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
      <div className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
        🔽 Filter: {varName} → {target}
        <div className="text-xs text-blue-600 mt-1">where {where}</div>
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Filter action
 * Called by event handlers (OnClick, etc.)
 */
export function executeFilterAction(
  props: FilterProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target, where } = props;

  // Validate required props
  if (!varName || !target || !where) {
    console.error('[Filter] Missing required props: var, target, and where are required');
    return;
  }

  // CRITICAL: Read from global manager instead of React state
  // This ensures we get the latest value from chained operations
  const variableValue = globalTemplateStateManager.getVariable(varName);

  // Check if variable exists
  if (variableValue === undefined || variableValue === null) {
    console.warn(`[Filter] Variable "${varName}" not found`);
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
    // Filter array
    const filtered = filterArray(sourceArray, where, context);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: 'array',
        initial: filtered
      });
    }

    // Update target variable
    templateState.setVariable(target, filtered);
  } catch (error) {
    console.error('[Filter] Failed to filter array:', error);
  }
}
