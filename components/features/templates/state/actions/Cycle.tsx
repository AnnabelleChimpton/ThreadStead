'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariableValue, getVariableObject } from '@/lib/templates/state/state-utils';

/**
 * Cycle Component - Action to cycle through a list of values
 *
 * This component is used inside event handlers (OnClick, OnChange, OnInterval, etc.)
 * to cycle a variable through a list of values. It does not render anything.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <Cycle var="theme" values="light,dark,auto" />
 *   </OnClick>
 *   Toggle Theme
 * </button>
 *
 * <OnInterval seconds="3">
 *   <Cycle var="statusIndex" values="0,1,2,3" />
 * </OnInterval>
 * ```
 */

export interface CycleProps {
  /** Variable name */
  var: string;

  /** Comma-separated list of values to cycle through */
  values: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Cycle is an action component) */
  children?: React.ReactNode;
}

export default function Cycle(props: CycleProps) {
  const {
    var: varName,
    values,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    if (!values) {
      return (
        <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-mono">
          ⚠️ Cycle: {varName} (missing values)
        </div>
      );
    }

    const displayValues = values.split(',').slice(0, 3).join(', ');
    const more = values.split(',').length > 3 ? '...' : '';

    return (
      <div className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded text-xs text-indigo-700 dark:text-indigo-300 font-mono">
        🔄 Cycle: {varName} ∈ [{displayValues}{more}]
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Cycle action
 * Called by event handlers (OnClick, OnInterval, etc.)
 *
 * @param props Cycle component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context for scoped variables
 */
export function executeCycleAction(
  props: CycleProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, values } = props;

  if (!values) {
    console.warn(`[Cycle] Missing required "values" prop for variable ${varName}`);
    return;
  }

  // Parse values list
  const valuesList = values.split(',').map(v => v.trim());

  if (valuesList.length === 0) {
    console.warn(`[Cycle] No values provided for variable ${varName}`);
    return;
  }

  // Get variable metadata (for validation)
  const variable = getVariableObject(varName, templateState);

  // Silently skip if variable not found yet (may still be registering)
  if (!variable) {
    return;
  }

  // Get FRESH current value (handles ForEach scope)
  const currentValue = getVariableValue(varName, forEachContext);

  // Find current index
  let currentIndex = valuesList.findIndex(v => {
    // Try to match as-is
    if (v === String(currentValue)) return true;
    // Try to match as number
    if (!isNaN(Number(v)) && Number(v) === Number(currentValue)) return true;
    return false;
  });

  // If not found, start at -1 so next is 0
  if (currentIndex === -1) {
    currentIndex = -1;
  }

  // Get next value (wrap around to 0)
  const nextIndex = (currentIndex + 1) % valuesList.length;
  let nextValue: any = valuesList[nextIndex];

  // Try to parse as number if possible
  if (!isNaN(Number(nextValue))) {
    nextValue = Number(nextValue);
  }

  // Update variable
  templateState.setVariable(varName, nextValue);
}
