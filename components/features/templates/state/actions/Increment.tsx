'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariableValue, getVariableObject } from '@/lib/templates/state/state-utils';

/**
 * Increment Component - Action to increment a numeric variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to increment variable values. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Increment var="counter" />
 *   </OnClick>
 *   +1
 * </button>
 *
 * <button>
 *   <OnClick>
 *     <Increment var="score" by="10" max="100" />
 *   </OnClick>
 *   +10 Points
 * </button>
 * ```
 */

export interface IncrementProps {
  /** Variable name to increment */
  var: string;

  /** Amount to increment by (default: 1) */
  by?: number;

  /** Minimum value (don't go below) */
  min?: number;

  /** Maximum value (don't go above) */
  max?: number;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Increment is an action component) */
  children?: React.ReactNode;
}

export default function Increment(props: IncrementProps) {
  const {
    var: varName,
    by = 1,
    min,
    max,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const details = [];
    if (by !== 1) details.push(`by ${by}`);
    if (min !== undefined) details.push(`min ${min}`);
    if (max !== undefined) details.push(`max ${max}`);

    return (
      <div className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300 font-mono">
        ⬆️ Increment: {varName}{details.length > 0 ? ` (${details.join(', ')})` : ''}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Increment action programmatically
 * Called by event handlers like OnClick
 *
 * @param props Increment component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executeIncrementAction(
  props: IncrementProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, by = 1, min, max } = props;

  if (!varName) {
    console.warn('Increment action: var prop is required');
    return;
  }

  try {
    // Get variable metadata (for type checking)
    const variable = getVariableObject(varName, templateState);

    if (!variable) {
      // Silently skip if variable not found yet (may still be registering)
      // This commonly happens with OnInterval firing before Var components register
      return;
    }

    // Check if variable is number type
    if (variable.type && variable.type !== 'number') {
      console.warn(`Increment action on non-number variable "${varName}" (type: ${variable.type})`);
      return;
    }

    // Get FRESH current value (handles ForEach scope)
    const currentValue = Number(getVariableValue(varName, forEachContext)) || 0;
    let newValue = currentValue + by;

    // Apply min constraint
    if (min !== undefined && newValue < min) {
      newValue = min;
    }

    // Apply max constraint
    if (max !== undefined && newValue > max) {
      newValue = max;
    }

    templateState.setVariable(varName, newValue);
  } catch (error) {
    console.error(`Increment action error for "${varName}":`, error);
  }
}
