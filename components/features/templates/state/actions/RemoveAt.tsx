'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useForEachContext } from '../loops/ForEach';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * RemoveAt Component - Action to remove an item at a specific index from an array variable
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to remove items from array variables by index. It does not render anything.
 *
 * @example
 * ```xml
 * <ForEach var="todoList" item="todo" index="i">
 *   <button>
 *     <OnClick>
 *       <RemoveAt var="todoList" index="{i}" />
 *     </OnClick>
 *     Delete
 *   </button>
 * </ForEach>
 * ```
 */

export interface RemoveAtProps {
  /** Variable name (should be array type) */
  var: string;

  /** Index to remove (number or {i} placeholder from ForEach) */
  index: number | string;

  /** Children (ignored - RemoveAt is an action component) */
  children?: React.ReactNode;
}

export default function RemoveAt(props: RemoveAtProps) {
  const {
    var: varName,
    index
  } = props;
  const forEachContext = useForEachContext();

  // Resolve index: use prop if provided, otherwise use ForEach context
  const resolvedIndex = index !== undefined ? index : forEachContext?.index;

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute RemoveAt action
 * Called by event handlers (OnClick, etc.)
 *
 * Note: The index parameter can be a number or a string.
 * If it's a string, it will be converted to a number.
 * ForEach components will pass the actual numeric index value via context.
 */
export function executeRemoveAtAction(
  props: RemoveAtProps,
  templateState: ReturnType<typeof useTemplateState>,
  forEachContext?: ReturnType<typeof useForEachContext>
): void {
  const { var: varName, index } = props;

  // DEFENSIVE: Check if varName is valid
  if (!varName || typeof varName !== 'string') {
    console.error('[RemoveAt] Missing or invalid "var" prop:', varName);
    console.error('[RemoveAt] Did you mean var="..." instead of array="..."?');
    return;
  }

  // Resolve index from $vars if it's a variable reference
  let resolvedIndex: number | string | undefined;

  if (typeof index === 'string' && index.startsWith('$vars.')) {
    const varPath = index.slice(6); // Remove "$vars." prefix
    const parts = varPath.split('.');
    const referencedVarName = parts[0];

    // Get referenced variable with FRESH state from global manager
    const freshVariables = globalTemplateStateManager.getAllVariables();
    const referencedVar = freshVariables[referencedVarName];

    let varValue = referencedVar?.value;

    // Handle nested properties: $vars.user.index
    for (let i = 1; i < parts.length; i++) {
      if (varValue === null || varValue === undefined) {
        varValue = undefined;
        break;
      }
      varValue = varValue[parts[i]];
    }

    resolvedIndex = varValue;
  } else if (typeof index === 'number' || (typeof index === 'string' && !index.startsWith('{'))) {
    // Direct index value (not a placeholder like {i})
    resolvedIndex = index;
  }

  // If still undefined, use ForEach context
  if (resolvedIndex === undefined) {
    resolvedIndex = forEachContext?.index;
  }


  // The list as it is now: a Push or RemoveAt just before this in the
  // same click isn't in the render's copy yet (bug bash 2026-10-26)
  const variable = globalTemplateStateManager.getAllVariables()[varName] ?? templateState.variables[varName];
  const currentArray = Array.isArray(variable?.value) ? variable.value : [];


  // Convert index to number
  const indexNum = typeof resolvedIndex === 'number' ? resolvedIndex : parseInt(String(resolvedIndex), 10);


  // Validate index
  if (isNaN(indexNum) || indexNum < 0 || indexNum >= currentArray.length) {
    console.warn(`[RemoveAt] Invalid index ${resolvedIndex} for array ${varName} (length: ${currentArray.length})`);
    return;
  }

  // Create new array with item removed
  const newArray = [
    ...currentArray.slice(0, indexNum),
    ...currentArray.slice(indexNum + 1)
  ];

  // Update variable
  templateState.setVariable(varName, newArray);
}
