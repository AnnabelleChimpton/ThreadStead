'use client';

import React, { useEffect } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnMount Component - Event handler for component mount
 *
 * Executes action components once when the parent component mounts.
 * Useful for initialization, counters, analytics, etc.
 *
 * @example
 * ```xml
 * <div>
 *   <OnMount>
 *     <Increment var="pageViews" />
 *     <Set var="initialized" value="true" />
 *   </OnMount>
 * </div>
 * ```
 *
 * Note: Actions execute only once when the component first renders.
 */

export interface OnMountProps {
  /** Action components to execute (Set, Increment, etc.) */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnMount(props: OnMountProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Execute actions on mount (only once)
  useEffect(() => {
    // Don't execute in visual builder mode
    if (isVisualBuilder) {
      return;
    }

    executeActions(children, templateState, residentData, forEachContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run only on mount

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🚀 OnMount Handler
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-purple-400 dark:border-purple-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing
  return null;
}
