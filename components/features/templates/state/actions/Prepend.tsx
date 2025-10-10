'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariableValue, getVariableObject, resolveVarsReference } from '@/lib/templates/state/state-utils';

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
 *
 * @param props Prepend component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executePrependAction(
  props: PrependProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, value } = props;

  // Get variable metadata (for type checking)
  const variable = getVariableObject(varName, templateState);

  // Check if variable is string type
  if (variable?.type && variable.type !== 'string') {
    console.warn(`Prepend action on non-string variable "${varName}" (type: ${variable.type})`);
    return;
  }

  // Get FRESH current value (handles ForEach scope)
  const currentValueData = getVariableValue(varName, forEachContext);
  const currentValue = currentValueData !== undefined ? String(currentValueData) : '';

  // Resolve value: check for $vars. references (handles scoped variables)
  const resolvedValue = typeof value === 'string' && value.startsWith('$vars.')
    ? String(resolveVarsReference(value, forEachContext) || '')
    : value;

  // Prepend value
  const newValue = String(resolvedValue) + currentValue;

  // Update variable
  templateState.setVariable(varName, newValue);
}
