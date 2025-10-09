'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { findInArray } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Find Component - Action to find first matching item in array
 *
 * Finds the first item in an array that matches a condition expression.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to search arrays. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Find admin user -->
 * <Button>
 *   <OnClick>
 *     <Find var="users" target="admin" where="item.role === 'admin'" />
 *   </OnClick>
 *   Find Admin
 * </Button>
 *
 * <!-- Find first matching item -->
 * <Button>
 *   <OnClick>
 *     <Find var="products" target="found" where="item.id === $vars.searchId" />
 *   </OnClick>
 *   Find Product
 * </Button>
 * ```
 */

export interface FindProps {
  /** Source array variable name */
  var: string;

  /** Target variable name to store found item */
  target: string;

  /** Condition expression (has access to 'item' and 'index') */
  where: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Find is an action component) */
  children?: React.ReactNode;
}

export default function Find(props: FindProps) {
  const {
    var: varName,
    target,
    where,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🔎 Find: {varName} → {target}
        <div className="text-xs text-purple-600 mt-1">where {where}</div>
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Find action
 * Called by event handlers (OnClick, etc.)
 */
export function executeFindAction(
  props: FindProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target, where } = props;

  // Validate required props
  if (!varName || !target || !where) {
    console.error('[Find] Missing required props: var, target, and where are required');
    return;
  }

  // CRITICAL: Read from global manager instead of React state
  // This ensures we get the latest value from chained operations
  const variableValue = globalTemplateStateManager.getVariable(varName);

  // Check if variable exists
  if (variableValue === undefined || variableValue === null) {
    console.warn(`[Find] Variable "${varName}" not found`);
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
    // Find first matching item
    const found = findInArray(sourceArray, where, context);

    // Determine type and value to store
    let varType: 'number' | 'boolean' | 'string';
    let valueToStore: any;

    if (found === undefined || found === null) {
      varType = 'string';
      valueToStore = null;
    } else if (typeof found === 'number') {
      varType = 'number';
      valueToStore = found;
    } else if (typeof found === 'boolean') {
      varType = 'boolean';
      valueToStore = found;
    } else if (typeof found === 'object') {
      // Store objects as JSON strings
      varType = 'string';
      valueToStore = JSON.stringify(found);
    } else {
      varType = 'string';
      valueToStore = String(found);
    }

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: varType,
        initial: valueToStore
      });
    }

    // Update target variable
    templateState.setVariable(target, valueToStore);
  } catch (error) {
    console.error('[Find] Failed to find in array:', error);
  }
}
