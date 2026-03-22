'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * SetURLHash Component - Set the URL hash (anchor)
 *
 * Action component that updates the URL hash without page reload.
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <SetURLHash value="section-2" />
 *   </OnClick>
 *   Go to Section 2
 * </Button>
 *
 * <Button>
 *   <OnClick>
 *     <SetURLHash expression="$vars.currentSection" />
 *   </OnClick>
 *   Update Hash
 * </Button>
 * ```
 */

export interface SetURLHashProps {
  /** Static hash value (without #) */
  value?: string;

  /** Expression to evaluate for dynamic hash value */
  expression?: string;
}

export default function SetURLHash(props: SetURLHashProps) {

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute SetURLHash action
 * Called by event handlers (OnClick, etc.)
 */
export function executeSetURLHashAction(
  props: SetURLHashProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { value, expression } = props;

  // Determine the hash value to set
  let hashValue: string;

  if (expression) {
    // Evaluate expression with FRESH template state from global manager, including scoped variables
    // This avoids stale state from async React updates (Set runs before state commits)
    const scopeId = forEachContext?.scopeId;
    const freshVariables = globalTemplateStateManager.getAllVariables();
    const context: Record<string, any> = {};

    // Add global variables
    Object.entries(freshVariables).forEach(([k, v]) => {
      context[k] = v.value;
    });

    // If we have a scope, check for scoped variables that might override globals
    if (scopeId) {
      const varMatches = expression.matchAll(/\$vars\.([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of varMatches) {
        const varName = match[1];
        const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, varName);
        if (scopedValue !== undefined) {
          context[varName] = scopedValue;
        }
      }
    }

    const result = evaluateExpression(expression, context);
    hashValue = String(result);
  } else if (value !== undefined) {
    hashValue = value;
  } else {
    console.warn('[SetURLHash] Missing value or expression prop');
    return;
  }

  // Update URL hash
  try {
    // Remove leading # if present
    const cleanHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
    window.location.hash = cleanHash;
    console.log(`[SetURLHash] Set hash to #${cleanHash}`);
  } catch (error) {
    console.error('[SetURLHash] Failed to update hash:', error);
  }
}
