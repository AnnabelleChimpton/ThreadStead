'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';

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
  value: any;

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
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300 font-mono">
        ➕ Push: {varName} ← {String(value)}
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
  const { var: varName, value } = props;

  // Get current array
  // Try both unprefixed and prefixed versions (user-content- workaround)
  let variable = templateState.variables[varName];
  if (!variable && !varName.startsWith('user-content-')) {
    variable = templateState.variables[`user-content-${varName}`];
  }

  // Check if variable is array type
  if (variable?.type && variable.type !== 'array') {
    console.warn(`Push action on non-array variable "${varName}" (type: ${variable.type})`);
    return;
  }

  const currentArray = Array.isArray(variable?.value) ? variable.value : [];

  // Evaluate value if it's a string that might be an expression
  let itemToAdd = value;
  if (typeof value === 'string' && value.includes('$vars')) {
    // Build context with all variables
    const context: Record<string, any> = {};
    Object.keys(templateState.variables).forEach(key => {
      context[key] = templateState.variables[key].value;
      // Also add unprefixed version for user-content- workaround
      if (key.startsWith('user-content-')) {
        const unprefixedKey = key.replace('user-content-', '');
        if (!context[unprefixedKey]) {
          context[unprefixedKey] = templateState.variables[key].value;
        }
      }
    });

    try {
      itemToAdd = evaluateExpression(value, context);
    } catch (error) {
      console.error(`[Push] Expression evaluation failed for "${value}":`, error);
      itemToAdd = value; // Fallback to literal value
    }
  }

  // Create new array with item added
  const newArray = [...currentArray, itemToAdd];

  // Update variable
  templateState.setVariable(varName, newArray);
}
