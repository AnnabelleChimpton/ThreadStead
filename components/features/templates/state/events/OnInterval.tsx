'use client';

import React, { useEffect, useRef } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnInterval Component - Event handler for periodic execution
 *
 * Executes action components on a regular interval.
 * Useful for animations, auto-rotating content, timers, etc.
 *
 * @example
 * ```xml
 * <OnInterval seconds="3">
 *   <Cycle var="statusIndex" values="0,1,2,3" />
 * </OnInterval>
 * ```
 *
 * Note: Interval is automatically cleared when component unmounts.
 */

export interface OnIntervalProps {
  /** Action components to execute (Set, Increment, etc.) */
  children?: React.ReactNode;

  /** Interval in seconds */
  seconds?: number;

  /** Interval in milliseconds (alternative to seconds) */
  milliseconds?: number;

}

export default function OnInterval(props: OnIntervalProps) {
  const {
    children,
    seconds,
    milliseconds,
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to always access current values without recreating interval
  const templateStateRef = useRef(templateState);
  const residentDataRef = useRef(residentData);
  const forEachContextRef = useRef(forEachContext);
  const childrenRef = useRef(children);

  // Update refs when values change
  useEffect(() => {
    templateStateRef.current = templateState;
    residentDataRef.current = residentData;
    forEachContextRef.current = forEachContext;
    childrenRef.current = children;
  }, [templateState, residentData, forEachContext, children]);

  // Calculate interval in milliseconds
  const intervalMs = milliseconds || (seconds ? seconds * 1000 : 1000);

  // Execute actions on interval
  useEffect(() => {
    // Wait for variables to be registered (100ms should be enough for all Var components)
    const initTimeout = setTimeout(() => {
      // Start interval - use refs to get current values
      intervalIdRef.current = setInterval(() => {
        executeActions(childrenRef.current, templateStateRef.current, residentDataRef.current, forEachContextRef.current);
      }, intervalMs);
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimeout);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
  // Note: We use refs for children/templateState/residentData to avoid recreating interval
  // but still access current values

  // Normal mode - render nothing
  return null;
}
