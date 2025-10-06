'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useForEachContext } from '../loops/ForEach';

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

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - RemoveAt is an action component) */
  children?: React.ReactNode;
}

export default function RemoveAt(props: RemoveAtProps) {
  const {
    var: varName,
    index,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;
  const forEachContext = useForEachContext();

  // Resolve index: use prop if provided, otherwise use ForEach context
  const resolvedIndex = index !== undefined ? index : forEachContext?.index;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayIndex = resolvedIndex !== undefined ? String(resolvedIndex) : '?';
    return (
      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-mono">
        🗑️ RemoveAt: {varName}[{displayIndex}]
      </div>
    );
  }

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

  // Resolve index from $vars if it's a variable reference
  let resolvedIndex: number | string | undefined;

  if (typeof index === 'string' && index.startsWith('$vars.')) {
    const varPath = index.slice(6); // Remove "$vars." prefix
    const parts = varPath.split('.');
    const referencedVarName = parts[0];

    console.log('[RemoveAt] Resolving $vars reference:', {
      index,
      varPath,
      referencedVarName,
      availableVars: Object.keys(templateState.variables)
    });

    // Get referenced variable
    let referencedVar = templateState.variables[referencedVarName];
    if (!referencedVar && !referencedVarName.startsWith('user-content-')) {
      referencedVar = templateState.variables[`user-content-${referencedVarName}`];
    }

    console.log('[RemoveAt] Variable lookup result:', {
      referencedVarName,
      found: !!referencedVar,
      value: referencedVar?.value,
      type: typeof referencedVar?.value
    });

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
    console.log('[RemoveAt] Final resolved value:', { resolvedIndex, type: typeof resolvedIndex });
  } else if (typeof index === 'number' || (typeof index === 'string' && !index.startsWith('{'))) {
    // Direct index value (not a placeholder like {i})
    resolvedIndex = index;
  }

  // If still undefined, use ForEach context
  if (resolvedIndex === undefined) {
    resolvedIndex = forEachContext?.index;
  }

  console.log('[RemoveAt] executeRemoveAtAction called:', {
    varName,
    propIndex: index,
    contextIndex: forEachContext?.index,
    resolvedIndex,
    indexType: typeof resolvedIndex,
    hasContext: !!forEachContext
  });

  // Get current array
  // Try both unprefixed and prefixed versions (user-content- workaround)
  let variable = templateState.variables[varName];
  if (!variable && !varName.startsWith('user-content-')) {
    variable = templateState.variables[`user-content-${varName}`];
  }
  const currentArray = Array.isArray(variable?.value) ? variable.value : [];

  console.log('[RemoveAt] Array state:', {
    currentArray,
    arrayLength: currentArray.length
  });

  // Convert index to number
  const indexNum = typeof resolvedIndex === 'number' ? resolvedIndex : parseInt(String(resolvedIndex), 10);

  console.log('[RemoveAt] Parsed index:', {
    indexNum,
    isValid: !isNaN(indexNum)
  });

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
