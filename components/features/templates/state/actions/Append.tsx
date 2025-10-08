'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Append Component - Action to append a string to a variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to append strings to string variables. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Append var="display" value="5" />
 *   </OnClick>
 *   Add 5
 * </button>
 * ```
 */

export interface AppendProps {
  /** Variable name (string type recommended) */
  var: string;

  /** String value to append */
  value: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Append is an action component) */
  children?: React.ReactNode;
}

export default function Append(props: AppendProps) {
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
      <div className="inline-block px-2 py-1 bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700 rounded text-xs text-teal-700 dark:text-teal-300 font-mono">
        ➡️ Append: {varName} += &quot;{value}&quot;
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Append action
 * Called by event handlers (OnClick, etc.)
 */
export function executeAppendAction(
  props: AppendProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, value } = props;

  // Get current value
  const variable = templateState.variables[varName];

  // Check if variable is string type
  if (variable?.type && variable.type !== 'string') {
    console.warn(`Append action on non-string variable "${varName}" (type: ${variable.type})`);
    return;
  }

  const currentValue = variable?.value !== undefined ? String(variable.value) : '';

  // Resolve value: check for $vars. references
  let resolvedValue = value;
  if (typeof value === 'string' && value.startsWith('$vars.')) {
    const varPath = value.slice(6); // Remove "$vars." prefix
    const parts = varPath.split('.');
    const referencedVarName = parts[0];

    // Get referenced variable with FRESH state from global manager
    const freshVariables = globalTemplateStateManager.getAllVariables();
    const referencedVar = freshVariables[referencedVarName];

    let varValue = referencedVar?.value;

    // Handle nested properties: $vars.user.name
    for (let i = 1; i < parts.length; i++) {
      if (varValue === null || varValue === undefined) {
        varValue = undefined;
        break;
      }
      varValue = varValue[parts[i]];
    }

    resolvedValue = varValue !== undefined ? String(varValue) : '';
  }

  // Append value
  const newValue = currentValue + String(resolvedValue);

  // Update variable
  templateState.setVariable(varName, newValue);
}
