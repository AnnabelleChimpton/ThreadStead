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

}

export default function OnMount(props: OnMountProps) {
  const { children } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // Execute actions on mount (only once)
  useEffect(() => {
    executeActions(children, templateState, residentData, forEachContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run only on mount

  // Normal mode - render nothing
  return null;
}
