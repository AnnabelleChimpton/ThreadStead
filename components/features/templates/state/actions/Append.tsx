'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariableValue, getVariableObject, resolveVarsReference } from '@/lib/templates/state/state-utils';

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

  /** Children (ignored - Append is an action component) */
  children?: React.ReactNode;
}

export default function Append(props: AppendProps) {
  const {
    var: varName,
    value
  } = props;

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Append action
 * Called by event handlers (OnClick, etc.)
 *
 * @param props Append component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executeAppendAction(
  props: AppendProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, value } = props;

  // Get variable metadata (for type checking)
  const variable = getVariableObject(varName, templateState);

  // Check if variable is string type
  if (variable?.type && variable.type !== 'string') {
    console.warn(`Append action on non-string variable "${varName}" (type: ${variable.type})`);
    return;
  }

  // Get FRESH current value (handles ForEach scope)
  const currentValueData = getVariableValue(varName, forEachContext);
  const currentValue = currentValueData !== undefined ? String(currentValueData) : '';

  // Resolve value: check for $vars. references (handles scoped variables)
  const resolvedValue = typeof value === 'string' && value.startsWith('$vars.')
    ? String(resolveVarsReference(value, forEachContext) || '')
    : value;

  // Append value
  const newValue = currentValue + String(resolvedValue);

  // Update variable
  templateState.setVariable(varName, newValue);
}
