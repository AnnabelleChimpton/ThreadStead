'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { transformArray } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Transform Component - Action to transform array items (map operation)
 *
 * Transforms each item in an array using an expression, creating a new array with transformed values.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to map arrays. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Apply tax to prices -->
 * <Button>
 *   <OnClick>
 *     <Transform var="prices" target="withTax" expression="item * 1.08" />
 *   </OnClick>
 *   Apply Tax
 * </Button>
 *
 * <!-- Extract property from objects -->
 * <Button>
 *   <OnClick>
 *     <Transform var="users" target="names" expression="item.name" />
 *   </OnClick>
 *   Get Names
 * </Button>
 * ```
 */

export interface TransformProps {
  /** Source array variable name */
  var: string;

  /** Target variable name to store transformed array */
  target: string;

  /** Transformation expression (has access to 'item' and 'index') */
  expression: string;

  /** Children (ignored - Transform is an action component) */
  children?: React.ReactNode;
}

export default function Transform(props: TransformProps) {
  const {
    var: varName,
    target,
    expression
  } = props;

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Transform action
 * Called by event handlers (OnClick, etc.)
 */
export function executeTransformAction(
  props: TransformProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target, expression } = props;

  // Validate required props
  if (!varName || !target || !expression) {
    console.error('[Transform] Missing required props: var, target, and expression are required');
    return;
  }

  // CRITICAL: Read from global manager instead of React state
  // This ensures we get the latest value from chained operations
  const variableValue = globalTemplateStateManager.getVariable(varName);

  // Check if variable exists
  if (variableValue === undefined || variableValue === null) {
    console.warn(`[Transform] Variable "${varName}" not found`);
    return;
  }

  const sourceArray = Array.isArray(variableValue) ? variableValue : [];

  // Build context with FRESH variables from global manager
  const freshVariables = globalTemplateStateManager.getAllVariables();
  const context: Record<string, any> = {};
  Object.keys(freshVariables).forEach(key => {
    context[key] = freshVariables[key].value;
  });

  try {
    // Transform array
    const transformed = transformArray(sourceArray, expression, context);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: 'array',
        initial: transformed
      });
    }

    // Update target variable
    templateState.setVariable(target, transformed);
  } catch (error) {
    console.error('[Transform] Failed to transform array:', error);
  }
}
