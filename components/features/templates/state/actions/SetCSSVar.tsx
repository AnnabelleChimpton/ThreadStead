'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';
import { pageElements, pageRoots } from './page-targets';

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
}

/** CSS functions that fetch a file */
const LOADS_SOMETHING = /(?:url|src|image|image-set|cross-fade)\s*\(/i;

export default function SetCSSVar(props: SetCSSVarProps) {

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
    // A worked-out value never loads anything: with a visitor's own values
    // (persisted Vars, ?var= links) in a url() it would be a tracking pixel.
    // A value written out in the page is the same as its CSS, so it may.
    // A backslash can spell url( as an escape (u\72l), so worked-out values can't have one
    if (LOADS_SOMETHING.test(cssValue) || cssValue.includes('\\')) return;
  } else if (value !== undefined) {
    cssValue = value;
  } else {
    return;
  }

  // Only custom properties, and only on the page: ":root" is the page's own
  // root, so the site's variables (and its nav) stay as they are
  if (!name.startsWith('--')) return;
  const targets = target === ':root' ? pageRoots() : pageElements(target).slice(0, 1);
  targets.forEach((el) => el.style.setProperty(name, cssValue));
}
