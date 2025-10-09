'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { sortArray } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Sort Component - Action to sort array
 *
 * Sorts an array by a property or expression in ascending or descending order.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to sort arrays. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Sort by property ascending -->
 * <Button>
 *   <OnClick>
 *     <Sort var="products" target="sorted" by="item.price" order="asc" />
 *   </OnClick>
 *   Sort by Price (Low to High)
 * </Button>
 *
 * <!-- Sort by expression descending -->
 * <Button>
 *   <OnClick>
 *     <Sort var="users" target="sorted" by="item.name.length" order="desc" />
 *   </OnClick>
 *   Sort by Name Length
 * </Button>
 * ```
 */

export interface SortProps {
  /** Source array variable name */
  var: string;

  /** Target variable name to store sorted array */
  target: string;

  /** Property path or expression to sort by (has access to 'item' and 'index') */
  by: string;

  /** Sort order: 'asc' (ascending) or 'desc' (descending) */
  order?: 'asc' | 'desc';

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Sort is an action component) */
  children?: React.ReactNode;
}

export default function Sort(props: SortProps) {
  const {
    var: varName,
    target,
    by,
    order = 'asc',
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 rounded text-xs text-rose-700 dark:text-rose-300 font-mono">
        🔀 Sort: {varName} → {target}
        <div className="text-xs text-rose-600 mt-1">
          by {by} ({order})
        </div>
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Sort action
 * Called by event handlers (OnClick, etc.)
 */
export function executeSortAction(
  props: SortProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target, by, order = 'asc' } = props;

  // Validate required props
  if (!varName || !target || !by) {
    console.error('[Sort] Missing required props: var, target, and by are required');
    return;
  }

  // Validate order
  if (order !== 'asc' && order !== 'desc') {
    console.error(`[Sort] Invalid order "${order}". Must be "asc" or "desc"`);
    return;
  }

  // CRITICAL: Read from global manager instead of React state
  // This ensures we get the latest value from chained operations
  const variableValue = globalTemplateStateManager.getVariable(varName);

  // Check if variable exists
  if (variableValue === undefined || variableValue === null) {
    console.warn(`[Sort] Variable "${varName}" not found`);
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
    // Sort array
    const sorted = sortArray(sourceArray, by, order, context);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: 'array',
        initial: sorted
      });
    }

    // Update target variable
    templateState.setVariable(target, sorted);
  } catch (error) {
    console.error('[Sort] Failed to sort array:', error);
  }
}
