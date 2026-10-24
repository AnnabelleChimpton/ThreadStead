'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { getVariableValue, getVariableObject, buildExpressionContext } from '@/lib/templates/state/state-utils';

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

  /** Children (ignored - Push is an action component) */
  children?: React.ReactNode;
}

export default function Push(props: PushProps) {
  const {
    var: varName,
    value,
    expression
  } = props;

  // Support both value and expression props (expression takes precedence)
  const actualValue = expression ?? value;

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Push action
 * Called by event handlers (OnClick, etc.)
 *
 * @param props Push component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executePushAction(
  props: PushProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, value, expression } = props;

  // DEFENSIVE: Check if varName is valid
  if (!varName || typeof varName !== 'string') {
    console.error('[Push] Missing or invalid "var" prop:', varName);
    console.error('[Push] Did you mean var="..." instead of array="..."?');
    console.error('[Push] Component props:', props);
    return;
  }

  // Support both value and expression props (expression takes precedence)
  const actualValue = expression ?? value;

  // Get variable metadata (for type checking)
  const variable = getVariableObject(varName, templateState);

  // Check if variable is array type
  if (variable?.type && variable.type !== 'array') {
    console.warn(`Push action on non-array variable "${varName}" (type: ${variable.type})`);
    return;
  }

  // Get FRESH current array (handles ForEach scope)
  const value_data = getVariableValue(varName, forEachContext);
  const currentArray = Array.isArray(value_data) ? value_data : [];

  // value= is pushed as written. expression= is read the way Set reads it:
  // a JSON list or object as it is, anything else worked out. Only text with
  // $vars in it used to be worked out, and what couldn't be was pushed as
  // its own text, so {n.text} showed literally (template audit 06 #10).
  let itemToAdd: unknown = actualValue;
  if (expression !== undefined) {
    const trimmed = expression.trim();
    const looksLikeJson = /^[[{][\s\S]*[\]}]$/.test(trimmed);
    try {
      itemToAdd = looksLikeJson ? JSON.parse(trimmed) : evaluateExpression(expression, buildExpressionContext(forEachContext));
    } catch {
      try {
        itemToAdd = evaluateExpression(expression, buildExpressionContext(forEachContext));
      } catch (error) {
        console.error(`[Push] Couldn't read expression "${expression}", so nothing was added:`, error);
        return;
      }
    }
  }

  // Create new array with item added
  const newArray = [...currentArray, itemToAdd];

  // Update variable
  templateState.setVariable(varName, newArray);
}
