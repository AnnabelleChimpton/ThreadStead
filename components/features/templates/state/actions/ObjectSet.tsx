'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { setNestedProperty } from '@/lib/templates/state/object-utils';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * ObjectSet Component - Action to set nested object property
 *
 * Sets a nested property in an object variable using dot notation.
 * Updates the object immutably (creates a new object).
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to modify nested object properties. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Set nested property with literal value -->
 * <Button>
 *   <OnClick>
 *     <ObjectSet var="user" path="profile.avatar" value="avatar.jpg" />
 *   </OnClick>
 *   Update Avatar
 * </Button>
 *
 * <!-- Set nested property with expression -->
 * <Button>
 *   <OnClick>
 *     <ObjectSet
 *       var="settings"
 *       path="theme"
 *       expression="$vars.isDark ? 'dark' : 'light'"
 *     />
 *   </OnClick>
 *   Toggle Theme
 * </Button>
 * ```
 */

export interface ObjectSetProps {
  /** Object variable name */
  var: string;

  /** Dot notation path to property (e.g., "profile.avatar", "settings.theme") */
  path: string;

  /** Literal value to set */
  value?: any;

  /** Expression to evaluate and set */
  expression?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - ObjectSet is an action component) */
  children?: React.ReactNode;
}

export default function ObjectSet(props: ObjectSetProps) {
  const {
    var: varName,
    path,
    value,
    expression,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayValue = expression
      ? `expr: ${expression}`
      : value !== undefined
        ? `value: ${String(value)}`
        : '(no value)';

    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🔧 ObjectSet: {varName}.{path} = {displayValue}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute ObjectSet action
 * Called by event handlers (OnClick, etc.)
 */
export function executeObjectSetAction(
  props: ObjectSetProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { var: varName, path, value, expression } = props;
  // Validate required props
  if (!varName || !path) {
    console.error('[ObjectSet] Missing required props: var and path are required');
    return;
  }

  try {
    // Get current object value from global manager
    const currentObject = globalTemplateStateManager.getVariable(varName);

    if (currentObject === undefined || currentObject === null) {
      console.warn(`[ObjectSet] Variable "${varName}" not found or is null`);
      return;
    }

    if (typeof currentObject !== 'object' || Array.isArray(currentObject)) {
      console.error(`[ObjectSet] Variable "${varName}" is not an object. typeof: ${typeof currentObject}, isArray: ${Array.isArray(currentObject)}`);
      return;
    }

    // Determine value to set
    let valueToSet: any;

    if (expression) {
      // Evaluate expression with FRESH variables from global manager
      const scopeId = forEachContext?.scopeId;
      const freshVariables = globalTemplateStateManager.getAllVariables();
      const context: Record<string, any> = {};

      // Add global variables
      Object.entries(freshVariables).forEach(([k, v]) => {
        context[k] = v.value;
      });

      // If we have a scope, check for scoped variables
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

      valueToSet = evaluateExpression(expression, context);
    } else if (value !== undefined) {
      valueToSet = value;
    } else {
      console.warn(`[ObjectSet] Neither expression nor value provided for "${varName}.${path}"`);
      return;
    }

    // Set nested property (immutably)
    const updatedObject = setNestedProperty(currentObject, path, valueToSet);

    // Update variable with modified object
    templateState.setVariable(varName, updatedObject);

  } catch (error) {
    console.error('[ObjectSet] Failed to set nested property:', error);
  }
}
