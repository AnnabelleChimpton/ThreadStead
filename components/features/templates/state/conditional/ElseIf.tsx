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
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const conditionDisplay = props.condition || props.data || 'condition';
    const operators = [];
    if (props.equals) operators.push(`== ${props.equals}`);
    if (props.notEquals) operators.push(`!= ${props.notEquals}`);
    if (props.greaterThan) operators.push(`> ${props.greaterThan}`);
    if (props.lessThan) operators.push(`< ${props.lessThan}`);
    if (props.greaterThanOrEqual) operators.push(`>= ${props.greaterThanOrEqual}`);
    if (props.lessThanOrEqual) operators.push(`<= ${props.lessThanOrEqual}`);

    return (
      <div className="inline-block px-2 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded text-xs text-orange-700 dark:text-orange-300 font-mono">
        ❓ ElseIf: {conditionDisplay} {operators.join(' ')}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-orange-400 dark:border-orange-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Condition evaluation happens in parent event handler
  return null;
}

// Export the evaluateIfCondition function under ElseIf name for clarity
export { evaluateIfCondition as evaluateElseIfCondition };
