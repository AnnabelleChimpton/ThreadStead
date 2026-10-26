'use client';

import React, { useEffect, useRef } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnVisible Component - Event handler for when element becomes visible
 *
 * Executes action components when the parent element enters the viewport.
 * Uses Intersection Observer API for efficient visibility detection.
 *
 * @example
 * ```xml
 * <div>
 *   <OnVisible>
 *     <Set var="viewCount" expression="$vars.viewCount + 1" />
 *     <ShowToast message="You found me!" type="info" />
 *   </OnVisible>
 *   Scroll down to see this!
 * </div>
 * ```
 */

export interface OnVisibleProps {
  /** Threshold for visibility (0-1, default: 0.5 = 50% visible) */
  threshold?: number | string;

  /** Execute only once (default: true) */
  once?: boolean | string;

  /** Action components to execute when visible */
  children?: React.ReactNode;

}

export default function OnVisible(props: OnVisibleProps) {
  const {
    threshold = 0.5,
    once = true,
    children,
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const hasExecutedRef = useRef(false);
  const targetRef = useRef<HTMLDivElement>(null);

  // Convert string props to proper types
  const thresholdValue = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
  const onceValue = once === true || once === 'true';

  // The actions as of the latest render, read when the box comes into
  // view. In the effect's deps they rebuilt the observer on every change
  // to the page's state, and a new observer reports "visible" at once: with
  // once="false" its actions ran again and again (bug bash 2026-10-26)
  const latest = useRef({ children, templateState, residentData, forEachContext });
  latest.current = { children, templateState, residentData, forEachContext };

  useEffect(() => {
    if (!targetRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Only when it comes into view, not on every report while it stays there
          if (!entry.isIntersecting) return;
          if (!hasExecutedRef.current || !onceValue) {
            const now = latest.current;
            executeActions(now.children, now.templateState, now.residentData, now.forEachContext);
            hasExecutedRef.current = true;
          }

          // If once=true, disconnect observer after first execution
          if (onceValue) {
            observer.disconnect();
          }
        });
      },
      {
        threshold: thresholdValue,
        rootMargin: '0px'
      }
    );

    observer.observe(targetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [thresholdValue, onceValue]);

  // Normal mode - render invisible marker element
  // The observer watches this element for visibility
  return <div ref={targetRef} style={{ position: 'absolute', pointerEvents: 'none' }} />;
}
