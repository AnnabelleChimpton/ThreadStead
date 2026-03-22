'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Reset Component - Reset variable(s) to initial value
 *
 * Action component that resets one or all variables to their initial values.
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <Reset var="counter" />
 *   </OnClick>
 *   Reset Counter
 * </Button>
 *
 * <Button>
 *   <OnClick>
 *     <Reset />
 *   </OnClick>
 *   Reset All
 * </Button>
 * ```
 */

export interface ResetProps {
  /** Variable name to reset (if omitted, resets all variables) */
  var?: string;
}

export default function Reset(props: ResetProps) {

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute Reset action
 * Called by event handlers (OnClick, etc.)
 *
 * @param props Reset component props
 * @param templateState Template state context
 * @param forEachContext ForEach loop context (unused, but kept for consistency)
 */
export function executeResetAction(
  props: ResetProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName } = props;

  if (varName) {
    // Reset specific variable
    if (templateState.resetVariable) {
      templateState.resetVariable(varName);
      console.log(`[Reset] Reset variable: ${varName}`);
    } else {
      console.warn('[Reset] resetVariable function not available on templateState');
    }
  } else {
    // Reset all variables
    if (templateState.resetAll) {
      templateState.resetAll();
      console.log('[Reset] Reset all variables');
    } else {
      console.warn('[Reset] resetAll function not available on templateState');
    }
  }
}
