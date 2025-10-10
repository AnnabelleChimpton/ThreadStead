'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariableValue, getVariableObject } from '@/lib/templates/state/state-utils';

/**
 * Toggle Component - Action to toggle a boolean variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to toggle boolean variable values (true <-> false). It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Toggle var="darkMode" />
 *   </OnClick>
 *   Toggle Dark Mode
 * </button>
 *
 * <button>
 *   <OnClick>
 *     <Toggle var="isOpen" />
 *   </OnClick>
 *   Open/Close
 * </button>
 * ```
 */

export interface ToggleProps {
  /** Variable name to toggle */
  var: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Toggle is an action component) */
  children?: React.ReactNode;
}

export default function Toggle(props: ToggleProps) {
  const {
    var: varName,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🔄 Toggle: {varName}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Toggle action programmatically
 * Called by event handlers like OnClick
 *
 * @param props Toggle component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executeToggleAction(
  props: ToggleProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName } = props;

  if (!varName) {
    console.warn('Toggle action: var prop is required');
    return;
  }

  try {
    // Get variable metadata (for validation)
    const variable = getVariableObject(varName, templateState);

    if (!variable) {
      console.warn(`Toggle action: variable "${varName}" not found`);
      return;
    }

    // Get FRESH current value (handles ForEach scope)
    const currentValue = getVariableValue(varName, forEachContext);
    // Toggle: convert to boolean and negate
    const newValue = !currentValue;

    templateState.setVariable(varName, newValue);
  } catch (error) {
    console.error(`Toggle action error for "${varName}":`, error);
  }
}
