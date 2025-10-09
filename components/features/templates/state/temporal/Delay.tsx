'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Delay Component - Execute actions after a delay
 *
 * This component is used inside event handlers (OnClick, etc.)
 * to delay the execution of child actions. Does not render anything.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <ShowToast message="Starting..." type="info" />
 *     <Delay seconds="2">
 *       <ShowToast message="Done!" type="success" />
 *       <Set var="completed" value="true" />
 *     </Delay>
 *   </OnClick>
 *   Click to Start
 * </Button>
 * ```
 *
 * @example With milliseconds
 * ```xml
 * <Delay milliseconds="500">
 *   <Set var="visible" value="true" />
 * </Delay>
 * ```
 */

export interface DelayProps {
  /** Delay in seconds */
  seconds?: number;

  /** Delay in milliseconds (alternative to seconds) */
  milliseconds?: number;

  /** Action components to execute after delay */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Delay(props: DelayProps) {
  const {
    seconds,
    milliseconds,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayDelay = seconds
      ? `${seconds}s`
      : milliseconds
        ? `${milliseconds}ms`
        : '0ms';

    return (
      <div className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-300 font-mono">
        ⏱️ Delay: {displayDelay}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-amber-400 dark:border-amber-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Delay action programmatically
 * Called by event handlers like OnClick
 *
 * @param props Delay component props
 * @param executeActions Function to execute child actions
 * @param templateState Template state context
 * @param residentData Resident data for condition evaluation
 * @param forEachContext ForEach loop context
 * @returns Promise that resolves when delay completes
 */
export function executeDelayAction(
  props: DelayProps,
  executeActions: (
    children: React.ReactNode,
    templateState: any,
    residentData: any,
    forEachContext?: any,
    currentElement?: HTMLElement
  ) => void,
  templateState: ReturnType<typeof useTemplateState>,
  residentData: any,
  forEachContext?: any,
  currentElement?: HTMLElement
): Promise<void> {
  const { seconds, milliseconds, children } = props;

  // Calculate delay in milliseconds
  const delayMs = milliseconds || (seconds ? seconds * 1000 : 0);

  // Return promise that resolves after delay
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        // Execute child actions after delay
        if (children) {
          executeActions(children, templateState, residentData, forEachContext, currentElement);
        }
        resolve();
      } catch (error) {
        console.error('[Delay] Error executing delayed actions:', error);
        resolve(); // Still resolve to prevent blocking
      }
    }, delayMs);
  });
}
