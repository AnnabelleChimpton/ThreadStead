'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * SetCSSVar Component - Set a CSS custom property (variable)
 *
 * Action component that sets a CSS variable on the document root or target element.
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <SetCSSVar name="--primary-color" value="#ff0000" />
 *     <SetCSSVar name="--spacing" value="2rem" />
 *     <SetCSSVar name="--hue" expression="$vars.hueValue" />
 *   </OnClick>
 *   Change Theme
 * </Button>
 * ```
 */

export interface SetCSSVarProps {
  /** CSS variable name (e.g., "--primary-color") */
  name: string;

  /** Static value to set */
  value?: string;

  /** Expression to evaluate for dynamic value */
  expression?: string;

  /** Target selector (default: ":root") */
  target?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function SetCSSVar(props: SetCSSVarProps) {
  const { __visualBuilder, _isInVisualBuilder } = props;
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700 rounded text-xs text-teal-700 dark:text-teal-300 font-mono">
        🎨 SetCSSVar: {props.name} = {props.value || props.expression}
      </div>
    );
  }

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute SetCSSVar action
 * Called by event handlers (OnClick, etc.)
 */
export function executeSetCSSVarAction(
  props: SetCSSVarProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { name, value, expression, target = ':root' } = props;

  if (!name) {
    return;
  }

  // Determine the value to set
  let cssValue: string;

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
    cssValue = String(result);
  } else if (value !== undefined) {
    cssValue = value;
  } else {
    return;
  }

  // Resolve target element
  let targetElement: HTMLElement;

  if (target === ':root') {
    targetElement = document.documentElement;
  } else {
    const el = document.querySelector(target);
    if (!el) {
      return;
    }
    targetElement = el as HTMLElement;
  }

  // Set the CSS variable
  targetElement.style.setProperty(name, cssValue);
}
