'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useSequenceContext } from './Sequence';

/**
 * Step Component - Single step in a Sequence
 *
 * Must be used as a child of Sequence component.
 * Defines a delay and actions to execute at this step.
 *
 * @example
 * ```xml
 * <Sequence>
 *   <Step delay="0">
 *     <Set var="status" value="loading" />
 *   </Step>
 *   <Step delay="1000">
 *     <Set var="status" value="ready" />
 *   </Step>
 * </Sequence>
 * ```
 */

export interface StepProps {
  /** Delay in milliseconds before this step executes */
  delay?: number;

  /** Action components to execute in this step */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Step(props: StepProps) {
  const {
    delay = 0,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const sequenceContext = useSequenceContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayDelay = delay >= 1000
      ? `${delay / 1000}s`
      : `${delay}ms`;

    return (
      <div className="inline-block px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 rounded text-xs text-cyan-700 dark:text-cyan-300 font-mono">
        ↪️ Step: +{displayDelay}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-cyan-400 dark:border-cyan-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Step is processed by parent Sequence component
  return null;
}
