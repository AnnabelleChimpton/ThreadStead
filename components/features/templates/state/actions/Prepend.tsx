'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Prepend Component - Action to prepend a string to a variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to prepend strings to string variables. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Prepend var="display" value="1" />
 *   </OnClick>
 *   Add 1 (front)
 * </button>
 * ```
 */

export interface PrependProps {
  /** Variable name (string type recommended) */
  var: string;

  /** String value to prepend */
  value: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Prepend is an action component) */
  children?: React.ReactNode;
}

export default function Prepend(props: PrependProps) {
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
        ⬅️ Prepend: &quot;{value}&quot; + {varName}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Prepend action
 * Called by event handlers (OnClick, etc.)
 */
export function executePrependAction(
  props: PrependProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, value } = props;

  // Get current value
  // Try both unprefixed and prefixed versions (user-content- workaround)
  let variable = templateState.variables[varName];
  if (!variable && !varName.startsWith('user-content-')) {
    variable = templateState.variables[`user-content-${varName}`];
  }

  // Check if variable is string type
  if (variable?.type && variable.type !== 'string') {
    console.warn(`Prepend action on non-string variable "${varName}" (type: ${variable.type})`);
    return;
  }

  const currentValue = variable?.value !== undefined ? String(variable.value) : '';

  // Resolve value: check for $vars. references
  let resolvedValue = value;
  if (typeof value === 'string' && value.startsWith('$vars.')) {
    const varPath = value.slice(6); // Remove "$vars." prefix
    const parts = varPath.split('.');
    const referencedVarName = parts[0];

    // Get referenced variable
    let referencedVar = templateState.variables[referencedVarName];
    if (!referencedVar && !referencedVarName.startsWith('user-content-')) {
      referencedVar = templateState.variables[`user-content-${referencedVarName}`];
    }

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

  // Prepend value
  const newValue = String(resolvedValue) + currentValue;

  // Update variable
  templateState.setVariable(varName, newValue);
}
