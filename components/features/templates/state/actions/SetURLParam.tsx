'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * SetURLParam Component - Set a URL query parameter
 *
 * Action component that updates a URL query parameter without page reload.
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <SetURLParam key="tab" value="settings" />
 *   </OnClick>
 *   Settings Tab
 * </Button>
 *
 * <Button>
 *   <OnClick>
 *     <SetURLParam key="page" expression="$vars.currentPage" />
 *   </OnClick>
 *   Update URL
 * </Button>
 * ```
 */

export interface SetURLParamProps {
  /** URL parameter key */
  key: string;

  /** Static value to set */
  value?: string;

  /** Expression to evaluate for dynamic value */
  expression?: string;
}

export default function SetURLParam(props: SetURLParamProps) {

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute SetURLParam action
 * Called by event handlers (OnClick, etc.)
 */
export function executeSetURLParamAction(
  props: SetURLParamProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { key, value, expression } = props;

  if (!key) {
    console.warn('[SetURLParam] Missing key prop');
    return;
  }

  // Determine the value to set
  let paramValue: string;

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
    paramValue = String(result);
  } else if (value !== undefined) {
    paramValue = value;
  } else {
    console.warn('[SetURLParam] Missing value or expression prop');
    return;
  }

  // Update URL parameter
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(key, paramValue);
    window.history.pushState({}, '', url.toString());
    console.log(`[SetURLParam] Set ?${key}=${paramValue}`);
  } catch (error) {
    console.error('[SetURLParam] Failed to update URL:', error);
  }
}
