'use client';

import React from 'react';

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

}

export default function Step(props: StepProps) {
  // Normal mode - component doesn't render
  // Step is processed by parent Sequence component
  return null;
}
