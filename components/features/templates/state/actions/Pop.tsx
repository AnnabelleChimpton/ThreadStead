'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Pop Component - Action to remove the last item from an array variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to remove the last item from array variables. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Pop var="todoList" />
 *   </OnClick>
 *   Remove Last
 * </button>
 * ```
 */

export interface PopProps {
  /** Variable name (should be array type) */
  var: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Pop is an action component) */
  children?: React.ReactNode;
}

export default function Pop(props: PopProps) {
  const {
    var: varName,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-mono">
        ➖ Pop: {varName}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Pop action
 * Called by event handlers (OnClick, etc.)
 */
export function executePopAction(
  props: PopProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName } = props;

  // Get current array
  const variable = templateState.variables[varName];

  // Check if variable is array type
  if (variable?.type && variable.type !== 'array') {
    console.warn(`Pop action on non-array variable "${varName}" (type: ${variable.type})`);
    return;
  }

  const currentArray = Array.isArray(variable?.value) ? variable.value : [];

  // Don't pop from empty array
  if (currentArray.length === 0) {
    console.warn(`[Pop] Cannot pop from empty array: ${varName}`);
    return;
  }

  // Create new array with last item removed
  const newArray = currentArray.slice(0, -1);

  // Update variable
  templateState.setVariable(varName, newArray);
}
