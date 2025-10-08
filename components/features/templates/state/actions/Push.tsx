'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Push Component - Action to add an item to an array variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to append items to array variables. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Push var="todoList" value="$vars.newTodo" />
 *   </OnClick>
 *   Add Todo
 * </button>
 * ```
 */

export interface PushProps {
  /** Variable name (should be array type) */
  var: string;

  /** Value to push (can be literal or expression with $vars) */
  value?: any;

  /** Expression to evaluate for the value (alias for value) */
  expression?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Push is an action component) */
  children?: React.ReactNode;
}

export default function Push(props: PushProps) {
  const {
    var: varName,
    value,
    expression,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // Support both value and expression props (expression takes precedence)
  const actualValue = expression ?? value;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300 font-mono">
        ➕ Push: {varName} ← {String(actualValue)}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Push action
 * Called by event handlers (OnClick, etc.)
 */
export function executePushAction(
  props: PushProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, value, expression } = props;

  console.log('[Push] executePushAction called with:', {
    varName,
    value,
    expression,
    allProps: props
  });

  // Support both value and expression props (expression takes precedence)
  const actualValue = expression ?? value;

  console.log('[Push] actualValue:', actualValue, 'type:', typeof actualValue);

  // Get current array
  const variable = templateState.variables[varName];

  // Check if variable is array type
  if (variable?.type && variable.type !== 'array') {
    console.warn(`Push action on non-array variable "${varName}" (type: ${variable.type})`);
    return;
  }

  const currentArray = Array.isArray(variable?.value) ? variable.value : [];

  // Evaluate value if it's a string that might be an expression
  let itemToAdd = actualValue;
  if (typeof actualValue === 'string' && actualValue.includes('$vars')) {
    // Build context with FRESH variables from global manager
    const freshVariables = globalTemplateStateManager.getAllVariables();
    const context: Record<string, any> = {};
    Object.keys(freshVariables).forEach(key => {
      context[key] = freshVariables[key].value;
    });

    try {
      itemToAdd = evaluateExpression(actualValue, context);
      console.log(`[Push] Evaluated expression "${actualValue}" to:`, itemToAdd);
    } catch (error) {
      console.error(`[Push] Expression evaluation failed for "${actualValue}":`, error);
      itemToAdd = actualValue; // Fallback to literal value
    }
  }

  // Create new array with item added
  const newArray = [...currentArray, itemToAdd];

  // Update variable
  templateState.setVariable(varName, newArray);
}
