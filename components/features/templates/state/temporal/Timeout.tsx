'use client';

import React, { useEffect, useRef } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { executeActions } from '../events/OnClick';

/**
 * Timeout Component - Auto-execute actions after duration
 *
 * Sets a timeout that executes OnTimeout child actions when it expires.
 * Useful for auto-dismissing messages, session timeouts, etc.
 *
 * @example
 * ```xml
 * <Var name="showMessage" type="boolean" initial="true" />
 *
 * <Show data="$vars.showMessage" equals="true">
 *   <div>This message will disappear in 5 seconds</div>
 * </Show>
 *
 * <Timeout seconds="5">
 *   <OnTimeout>
 *     <Set var="showMessage" value="false" />
 *     <ShowToast message="Message dismissed" type="info" />
 *   </OnTimeout>
 * </Timeout>
 * ```
 *
 * @example Auto-logout
 * ```xml
 * <Timeout seconds="1800">
 *   <OnTimeout>
 *     <ShowToast message="Session expired" type="warning" />
 *     <Set var="isLoggedIn" value="false" />
 *   </OnTimeout>
 * </Timeout>
 * ```
 */

export interface TimeoutProps {
  /** Timeout duration in seconds */
  seconds?: number;

  /** Timeout duration in milliseconds (alternative to seconds) */
  milliseconds?: number;

  /** OnTimeout child component with actions to execute */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Timeout(props: TimeoutProps) {
  const {
    seconds,
    milliseconds,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to always access current values without recreating timeout
  const templateStateRef = useRef(templateState);
  const residentDataRef = useRef(residentData);
  const childrenRef = useRef(children);

  // Update refs when values change
  useEffect(() => {
    templateStateRef.current = templateState;
    residentDataRef.current = residentData;
    childrenRef.current = children;
  }, [templateState, residentData, children]);

  // Calculate timeout in milliseconds
  const timeoutMs = milliseconds || (seconds ? seconds * 1000 : 5000);

  // Execute timeout
  useEffect(() => {
    // Don't execute in visual builder mode
    if (isVisualBuilder) {
      return;
    }

    // Set timeout - use refs to get current values
    timeoutIdRef.current = setTimeout(() => {
      // Find OnTimeout child and execute its actions
      const childArray = React.Children.toArray(childrenRef.current);

      for (const child of childArray) {
        if (!React.isValidElement(child)) continue;

        // P3.3 FIX: Unwrap IslandErrorBoundary if present (islands architecture)
        let actualChild = child;
        if (typeof child.type === 'function' &&
            (child.type.name === 'IslandErrorBoundary' ||
             (child.type as any).displayName === 'IslandErrorBoundary')) {
          const boundaryChildren = React.Children.toArray((child.props as any).children);
          if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
            actualChild = boundaryChildren[0];
          }
        }

        // Unwrap ResidentDataProvider if present (islands architecture)
        if (typeof actualChild.type === 'function' &&
            (actualChild.type.name === 'ResidentDataProvider' ||
             (actualChild.type as any).displayName === 'ResidentDataProvider')) {
          const providerChildren = React.Children.toArray((actualChild.props as any).children);
          if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
            actualChild = providerChildren[0];
          }
        }

        // Get component name
        const componentName = typeof actualChild.type === 'function'
          ? actualChild.type.name || (actualChild.type as any).displayName
          : '';

        // Execute OnTimeout actions
        if (componentName === 'OnTimeout') {
          const onTimeoutChildren = (actualChild.props as any).children;
          if (onTimeoutChildren) {
            executeActions(onTimeoutChildren, templateStateRef.current, residentDataRef.current);
          }
        }
      }
    }, timeoutMs);

    // Cleanup on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [timeoutMs, isVisualBuilder]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayTimeout = seconds
      ? `${seconds}s`
      : milliseconds
        ? `${milliseconds}ms`
        : '5s';

    return (
      <div className="inline-block px-2 py-1 bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 rounded text-xs text-rose-700 dark:text-rose-300 font-mono">
        ⏰ Timeout: {displayTimeout}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-rose-400 dark:border-rose-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing
  return null;
}
