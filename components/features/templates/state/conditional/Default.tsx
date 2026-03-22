'use client';

import React from 'react';
import { useSwitchContext } from './Switch';

/**
 * Default Component - Fallback case for Switch
 *
 * Child of Switch component. Executes its children if:
 * ALL previous Case components failed to match.
 *
 * Similar to 'default:' in switch statements or 'else' in if/else chains.
 *
 * @example
 * ```xml
 * <Switch value="$vars.status">
 *   <Case value="pending">⏳ Pending</Case>
 *   <Case value="approved">✅ Approved</Case>
 *   <Case value="rejected">❌ Rejected</Case>
 *   <Default>
 *     <ShowToast message="Unknown status!" type="warning" />
 *     <Set var="status" value="unknown" />
 *   </Default>
 * </Switch>
 * ```
 */

export interface DefaultProps {
  /** Actions to execute as fallback when no Case matches */
  children?: React.ReactNode;

}

export default function Default(props: DefaultProps) {
  const { children } = props;

  const switchContext = useSwitchContext();

  // Normal mode - render if no Case has matched
  // Return null if no switch context (used outside Switch)
  if (!switchContext) {
    console.warn('[Default] Used outside of Switch component');
    return null;
  }

  // Render children if no Case has matched yet
  return !switchContext.hasMatched ? <>{children}</> : null;
}

/**
 * Check if Default should execute
 * Called by event handlers - Default executes if no Case has matched
 *
 * @param switchContext Switch context with match state
 * @returns true if Default should execute (no Case matched), false otherwise
 */
export function shouldExecuteDefault(
  switchContext: { hasMatched: boolean } | null
): boolean {
  // If no switch context, shouldn't execute
  if (!switchContext) {
    console.warn('[Default] Used outside of Switch component');
    return false;
  }

  // Execute if no Case has matched yet
  return !switchContext.hasMatched;
}
