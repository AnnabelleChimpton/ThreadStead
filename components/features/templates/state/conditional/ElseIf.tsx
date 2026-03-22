'use client';

import React from 'react';
import { evaluateIfCondition, type IfProps } from './If';

/**
 * ElseIf Component - Secondary conditional action execution
 *
 * Part of an If/ElseIf/Else chain. Only executes if:
 * 1. Previous If/ElseIf conditions were false
 * 2. This ElseIf's condition is true
 *
 * @example
 * ```xml
 * <OnClick>
 *   <If condition="$vars.score" greaterThanOrEqual="90">
 *     <Set var="grade" value="A" />
 *   </If>
 *   <ElseIf condition="$vars.score" greaterThanOrEqual="80">
 *     <Set var="grade" value="B" />
 *   </ElseIf>
 *   <ElseIf condition="$vars.score" greaterThanOrEqual="70">
 *     <Set var="grade" value="C" />
 *   </ElseIf>
 *   <Else>
 *     <Set var="grade" value="F" />
 *   </Else>
 * </OnClick>
 * ```
 */

// ElseIf has the same props as If
export type ElseIfProps = IfProps;

export default function ElseIf(props: ElseIfProps) {
  // Normal mode - component doesn't render
  // Condition evaluation happens in parent event handler
  return null;
}

// Export the evaluateIfCondition function under ElseIf name for clarity
export { evaluateIfCondition as evaluateElseIfCondition };
