'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';
import type { useForEachContext } from '../loops/ForEach';

/**
 * CopyToClipboard Component - Copy text to clipboard
 *
 * Action component that copies text to the clipboard.
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <CopyToClipboard value="https://example.com/share" />
 *     <ShowToast message="Link copied!" type="success" />
 *   </OnClick>
 *   Share Link
 * </Button>
 *
 * <Button>
 *   <OnClick>
 *     <CopyToClipboard expression="$vars.userEmail" />
 *   </OnClick>
 *   Copy Email
 * </Button>
 * ```
 */

export interface CopyToClipboardProps {
  /** Static value to copy */
  value?: string;

  /** Expression to evaluate for dynamic value */
  expression?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function CopyToClipboard(props: CopyToClipboardProps) {
  const { __visualBuilder, _isInVisualBuilder } = props;
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded text-xs text-emerald-700 dark:text-emerald-300 font-mono">
        📋 Copy: {props.value || props.expression}
      </div>
    );
  }

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute CopyToClipboard action
 * Called by event handlers (OnClick, etc.)
 */
export async function executeCopyToClipboardAction(
  props: CopyToClipboardProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: ReturnType<typeof useForEachContext>
): Promise<void> {
  const { value, expression } = props;

  console.log('[CopyToClipboard] executeCopyToClipboardAction called with:', {
    value,
    expression,
    scopeId: forEachContext?.scopeId,
    allProps: props
  });

  // Determine the value to copy
  let textToCopy: string;

  if (expression) {
    // Evaluate expression with FRESH variables, including scoped variables from ForEach
    const scopeId = forEachContext?.scopeId;

    // Build context with both global and scoped variables
    const freshVariables = globalTemplateStateManager.getAllVariables();
    const context: Record<string, any> = {};

    // Add global variables
    Object.entries(freshVariables).forEach(([k, v]) => {
      context[k] = v.value;
    });

    // If we have a scope, check for scoped variables that might override globals
    if (scopeId) {
      // For each variable in expression, try to resolve from scope first
      // This is a simple implementation - extract var names from expression
      const varMatches = expression.matchAll(/\$vars\.([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of varMatches) {
        const varName = match[1];
        const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, varName);
        if (scopedValue !== undefined) {
          context[varName] = scopedValue;
          console.log(`[CopyToClipboard] Using scoped variable "${varName}":`, scopedValue);
        }
      }
    }

    const result = evaluateExpression(expression, context);
    textToCopy = String(result);
  } else if (value !== undefined) {
    textToCopy = value;
  } else {
    console.warn('[CopyToClipboard] Missing value or expression prop');
    return;
  }

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(textToCopy);
    console.log('[CopyToClipboard] Copied to clipboard:', textToCopy);
  } catch (error) {
    console.error('[CopyToClipboard] Failed to copy:', error);

    // Fallback method for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log('[CopyToClipboard] Copied using fallback method');
    } catch (fallbackError) {
      console.error('[CopyToClipboard] Fallback failed:', fallbackError);
    }
  }
}
