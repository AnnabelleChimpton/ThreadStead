'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Set Component - Action to set a variable value
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to update variable values. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Set var="counter" expression="$vars.counter + 1" />
 *   </OnClick>
 *   Increment
 * </button>
 *
 * <button>
 *   <OnClick>
 *     <Set var="message" value="Hello World" />
 *   </OnClick>
 *   Set Message
 * </button>
 * ```
 */

export interface SetProps {
  /** Variable name to set */
  var: string;

  /** Literal value to set (string, number, boolean) */
  value?: any;

  /** Expression to evaluate and set (uses expression evaluator) */
  expression?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Set is an action component) */
  children?: React.ReactNode;
}

export default function Set(props: SetProps) {
  const {
    var: varName,
    value,
    expression,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayValue = expression
      ? `expr: ${expression}`
      : value !== undefined
        ? `value: ${String(value)}`
        : '(no value)';

    return (
      <div className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
        ⚡ Set: {varName} = {displayValue}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Set action programmatically
 * Called by event handlers like OnClick
 *
 * @param props Set component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executeSetAction(
  props: SetProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, value, expression } = props;

  if (!varName) {
    console.warn('Set action: var prop is required');
    return;
  }

  try {
    if (expression) {
      // Evaluate expression with FRESH variables from global manager, including scoped variables
      const scopeId = forEachContext?.scopeId;
      const freshVariables = globalTemplateStateManager.getAllVariables();
      const context: Record<string, any> = {};

      // Add global variables
      Object.entries(freshVariables).forEach(([k, v]) => {
        context[k] = v.value;
      });

      // If we have a scope, check for scoped variables that might override globals
      if (scopeId) {
        const varMatches = expression.matchAll(/\$vars\.([a-zA-Z_][a-zA-Z0-9_]*)/g);
        for (const match of varMatches) {
          const varName = match[1];
          const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, varName);
          if (scopedValue !== undefined) {
            context[varName] = scopedValue;
          }
        }
      }

      const result = evaluateExpression(expression, context);
      templateState.setVariable(varName, result);
    } else if (value !== undefined) {
      // Set literal value
      templateState.setVariable(varName, value);
    } else {
      console.warn(`Set action for "${varName}": neither expression nor value provided`);
    }
  } catch (error) {
    console.error(`Set action error for "${varName}":`, error);
  }
}
