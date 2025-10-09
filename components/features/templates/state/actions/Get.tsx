'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getDynamicProperty } from '@/lib/templates/state/collection-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Get Component - Action to dynamically access object property or array index
 *
 * Accesses a property or index dynamically, useful when the accessor is stored in a variable.
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to retrieve values dynamically. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Get array element by variable index -->
 * <Button>
 *   <OnClick>
 *     <Get from="$vars.items" at="$vars.currentIndex" target="currentItem" />
 *   </OnClick>
 *   Get Current Item
 * </Button>
 *
 * <!-- Get object property -->
 * <Button>
 *   <OnClick>
 *     <Get from="$vars.user" at="name" target="userName" />
 *   </OnClick>
 *   Get User Name
 * </Button>
 * ```
 */

export interface GetProps {
  /** Source object or array (can be $vars reference or variable name) */
  from: string;

  /** Property name or index to access (can be $vars reference or literal) */
  at: string | number;

  /** Target variable name to store result */
  target: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Get is an action component) */
  children?: React.ReactNode;
}

export default function Get(props: GetProps) {
  const {
    from,
    at,
    target,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 rounded text-xs text-cyan-700 dark:text-cyan-300 font-mono">
        🔍 Get: {from}[{String(at)}] → {target}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Get action
 * Called by event handlers (OnClick, etc.)
 */
export function executeGetAction(
  props: GetProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { from, at, target } = props;

  // Validate required props
  if (!from || at === undefined || !target) {
    console.error('[Get] Missing required props: from, at, and target are required');
    return;
  }

  // Build context with FRESH variables from global manager
  const freshVariables = globalTemplateStateManager.getAllVariables();
  const context: Record<string, any> = {};
  Object.keys(freshVariables).forEach(key => {
    context[key] = freshVariables[key].value;
  });

  try {
    // Resolve source object/array
    let sourceValue: any;
    if (typeof from === 'string' && from.startsWith('$vars.')) {
      const varName = from.slice(6);
      sourceValue = context[varName];
    } else {
      // Direct variable name
      sourceValue = context[from];
    }

    if (sourceValue === undefined || sourceValue === null) {
      console.warn(`[Get] Source "${from}" is null or undefined`);
      return;
    }

    // Get property/index value
    const value = getDynamicProperty(sourceValue, at, context);

    // Determine type and value to store
    let varType: 'number' | 'boolean' | 'string';
    let valueToStore: any;

    if (value === undefined || value === null) {
      varType = 'string';
      valueToStore = '';
    } else if (typeof value === 'number') {
      varType = 'number';
      valueToStore = value;
    } else if (typeof value === 'boolean') {
      varType = 'boolean';
      valueToStore = value;
    } else if (typeof value === 'object') {
      // Store objects as JSON strings
      varType = 'string';
      valueToStore = JSON.stringify(value);
    } else {
      varType = 'string';
      valueToStore = String(value);
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
    console.error('[Get] Failed to get property:', error);
  }
}
