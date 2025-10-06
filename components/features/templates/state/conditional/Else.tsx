'use client';

import React from 'react';

/**
 * Else Component - Fallback action execution
 *
 * Part of an If/ElseIf/Else chain. Only executes if:
 * ALL previous If/ElseIf conditions were false.
 *
 * @example
 * ```xml
 * <OnClick>
 *   <If condition="$vars.counter" lessThan="10">
 *     <Increment var="counter" />
 *   </If>
 *   <Else>
 *     <ShowToast message="Counter is at max!" />
 *   </Else>
 * </OnClick>
 * ```
 */

export interface ElseProps {
  /** Action components to execute as fallback */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Else(props: ElseProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-900/30 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 font-mono">
        ↩️ Else (fallback)
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-gray-400 dark:border-gray-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Execution happens in parent event handler
  return null;
}
