'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';

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
 */
export function executeSetAction(
  props: SetProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, value, expression } = props;

  if (!varName) {
    console.warn('Set action: var prop is required');
    return;
  }

  try {
    if (expression) {
      // Evaluate expression
      // Build context with all variable values
      const context = Object.fromEntries(
        Object.entries(templateState.variables).map(([k, v]) => [k, v.value])
      );

      // WORKAROUND: Add unprefixed aliases for user-content-* variables
      // This handles the HTML parser transforming <var name="counter"> to have name="user-content-counter"
      Object.keys(templateState.variables).forEach(key => {
        if (key.startsWith('user-content-')) {
          const unprefixedKey = key.replace('user-content-', '');
          if (!context[unprefixedKey]) {
            context[unprefixedKey] = templateState.variables[key].value;
          }
        }
      });

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
