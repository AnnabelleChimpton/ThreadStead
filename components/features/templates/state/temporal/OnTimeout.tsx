'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * OnTimeout Component - Event handler for Timeout expiration
 *
 * Must be used as a child of Timeout component.
 * Contains action components to execute when timeout expires.
 *
 * @example
 * ```xml
 * <Timeout seconds="10">
 *   <OnTimeout>
 *     <ShowToast message="Time's up!" type="warning" />
 *     <Set var="expired" value="true" />
 *   </OnTimeout>
 * </Timeout>
 * ```
 */

export interface OnTimeoutProps {
  /** Action components to execute when timeout expires */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnTimeout(props: OnTimeoutProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-mono">
        ⏲️ OnTimeout Handler
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-red-400 dark:border-red-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Execution is handled by parent Timeout component
  return null;
}
