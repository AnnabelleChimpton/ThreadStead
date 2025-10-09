'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { sumArray } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Sum Component - Action to sum numeric values in array
 *
 * Sums all numeric values in an array, with optional property path for arrays of objects.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to calculate totals. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Sum array of numbers -->
 * <Button>
 *   <OnClick>
 *     <Sum var="prices" target="total" />
 *   </OnClick>
 *   Calculate Total
 * </Button>
 *
 * <!-- Sum object property -->
 * <Button>
 *   <OnClick>
 *     <Sum var="orders" target="revenue" property="amount" />
 *   </OnClick>
 *   Calculate Revenue
 * </Button>
 * ```
 */

export interface SumProps {
  /** Source array variable name */
  var: string;

  /** Target variable name to store sum */
  target: string;

  /** Optional property path for arrays of objects (e.g., "price" or "user.age") */
  property?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Sum is an action component) */
  children?: React.ReactNode;
}

export default function Sum(props: SumProps) {
  const {
    var: varName,
    target,
    property,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300 font-mono">
        ➕ Sum: {varName}
        {property && <span className="text-green-600">.{property}</span>}
        {' '} → {target}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Sum action
 * Called by event handlers (OnClick, etc.)
 */
export function executeSumAction(
  props: SumProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target, property } = props;

  // Validate required props
  if (!varName || !target) {
    console.error('[Sum] Missing required props: var and target are required');
    return;
  }

  // CRITICAL: Read from global manager instead of React state
  // This ensures we get the latest value from chained operations
  const variableValue = globalTemplateStateManager.getVariable(varName);

  // Check if variable exists
  if (variableValue === undefined || variableValue === null) {
    console.warn(`[Sum] Variable "${varName}" not found`);
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
    // Sum array values
    const sum = sumArray(sourceArray, property, context);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: 'number',
        initial: sum
      });
    }

    // Update target variable
    templateState.setVariable(target, sum);
  } catch (error) {
    console.error('[Sum] Failed to sum array:', error);
  }
}
