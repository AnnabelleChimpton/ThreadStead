'use client';

import React from 'react';

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

}

export default function OnTimeout(props: OnTimeoutProps) {
  // Normal mode - component doesn't render
  // Execution is handled by parent Timeout component
  return null;
}
