'use client';

import React from 'react';

/**
 * Else Component - Fallback action execution
 *
 * Part of an If/ElseIf/Else chain. Only executes if:
 * ALL previous If/ElseIf conditions were false.
 *
 * @example
 * ```xml
 * <OnClick>
 *   <If condition="$vars.counter" lessThan="10">
 *     <Increment var="counter" />
 *   </If>
 *   <Else>
 *     <ShowToast message="Counter is at max!" />
 *   </Else>
 * </OnClick>
 * ```
 */

export interface ElseProps {
  /** Action components to execute as fallback */
  children?: React.ReactNode;

}

export default function Else(props: ElseProps) {
  // Normal mode - component doesn't render
  // Execution happens in parent event handler
  return null;
}
