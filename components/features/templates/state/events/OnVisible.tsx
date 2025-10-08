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

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnVisible(props: OnVisibleProps) {
  const {
    threshold = 0.5,
    once = true,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;
  const hasExecutedRef = useRef(false);
  const targetRef = useRef<HTMLDivElement>(null);

  // Convert string props to proper types
  const thresholdValue = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
  const onceValue = once === true || once === 'true';

  useEffect(() => {
    // Don't set up observer in visual builder mode
    if (isVisualBuilder || !targetRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Element is visible
            if (!hasExecutedRef.current || !onceValue) {
              executeActions(children, templateState, residentData, forEachContext);
              hasExecutedRef.current = true;
            }

            // If once=true, disconnect observer after first execution
            if (onceValue) {
              observer.disconnect();
            }
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
  }, [children, isVisualBuilder, thresholdValue, onceValue, templateState, residentData, forEachContext]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-lime-100 dark:bg-lime-900/30 border border-lime-300 dark:border-lime-700 rounded text-xs text-lime-700 dark:text-lime-300 font-mono">
        👁️ OnVisible ({Math.round(thresholdValue * 100)}% threshold)
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-lime-400 dark:border-lime-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render invisible marker element
  // The observer watches this element for visibility
  return <div ref={targetRef} style={{ position: 'absolute', pointerEvents: 'none' }} />;
}
