'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { cloneObject } from '@/lib/templates/state/object-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Clone Component - Action to deep clone a variable
 *
 * Creates a deep copy of an object or array variable, preventing mutations
 * to the original when the clone is modified.
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to clone variables. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Clone user object -->
 * <Button>
 *   <OnClick>
 *     <Clone var="user" target="userCopy" />
 *   </OnClick>
 *   Clone User
 * </Button>
 *
 * <!-- Clone array -->
 * <Button>
 *   <OnClick>
 *     <Clone var="items" target="itemsBackup" />
 *   </OnClick>
 *   Create Backup
 * </Button>
 * ```
 */

export interface CloneProps {
  /** Source variable name to clone */
  var: string;

  /** Target variable name to store cloned copy */
  target: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Clone is an action component) */
  children?: React.ReactNode;
}

export default function Clone(props: CloneProps) {
  const {
    var: varName,
    target,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        📋 Clone: {varName} → {target}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Clone action
 * Called by event handlers (OnClick, etc.)
 */
export function executeCloneAction(
  props: CloneProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { var: varName, target } = props;

  // Validate required props
  if (!varName || !target) {
    console.error('[Clone] Missing required props: var and target are required');
    return;
  }

  try {
    // Get source variable from global manager
    const sourceValue = globalTemplateStateManager.getVariable(varName);

    if (sourceValue === undefined || sourceValue === null) {
      console.warn(`[Clone] Source variable "${varName}" not found or is null`);
      return;
    }

    // Clone the value
    const clonedValue = cloneObject(sourceValue);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      // Determine type from source
      let type: 'object' | 'array' | 'string' | 'number' | 'boolean' = 'object';
      if (Array.isArray(clonedValue)) {
        type = 'array';
      } else if (typeof clonedValue === 'string') {
        type = 'string';
      } else if (typeof clonedValue === 'number') {
        type = 'number';
      } else if (typeof clonedValue === 'boolean') {
        type = 'boolean';
      }

      templateState.registerVariable({
        name: target,
        type,
        initial: clonedValue
      });
    }

    // Update target variable with cloned value
    templateState.setVariable(target, clonedValue);
  } catch (error) {
    console.error('[Clone] Failed to clone variable:', error);
  }
}
