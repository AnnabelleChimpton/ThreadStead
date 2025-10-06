'use client';

import React from 'react';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';

/**
 * If Component - Conditional action execution
 *
 * IMPORTANT: This is NOT the same as <Show>!
 * - <Show> controls rendering (display vs hide)
 * - <If> controls action execution (inside event handlers like OnClick)
 *
 * The If component only executes its child actions if the condition evaluates to true.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <If condition="$vars.counter" lessThan="10">
 *       <Increment var="counter" />
 *     </If>
 *     <ElseIf condition="$vars.counter" equals="10">
 *       <Set var="counter" value="0" />
 *       <ShowToast message="Reset!" />
 *     </ElseIf>
 *     <Else>
 *       <ShowToast message="Max reached!" />
 *     </Else>
 *   </OnClick>
 * </button>
 * ```
 */

export interface IfProps {
  // Data path to check (used with operators or for truthy check)
  condition?: string;
  data?: string; // Alias for condition

  // Comparison operators
  equals?: string;
  notEquals?: string;
  greaterThan?: string | number;
  lessThan?: string | number;
  greaterThanOrEqual?: string | number;
  lessThanOrEqual?: string | number;

  // String operators
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string; // regex pattern

  // Existence check
  exists?: string | boolean;

  // Logical operators
  and?: string | string[];
  or?: string | string[];
  not?: string;

  // Action components to execute if condition is true
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function If(props: IfProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder,
    ...conditionProps
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
      <div className="inline-block px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-700 dark:text-yellow-300 font-mono">
        ❓ If: {conditionDisplay} {operators.join(' ')}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-yellow-400 dark:border-yellow-600">
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

/**
 * Evaluate If condition
 * Called by event handlers to determine if child actions should execute
 *
 * @param props If component props
 * @param residentData Resident data context
 * @returns true if condition is met, false otherwise
 */
export function evaluateIfCondition(
  props: IfProps,
  residentData: any
): boolean {
  const { condition, data, ...rest } = props;

  // Build condition config
  const config: ConditionConfig = {
    ...(condition || data ? { data: condition || data } : {}),
    ...rest
  } as ConditionConfig;

  // Use centralized condition evaluator
  return evaluateFullCondition(config, residentData);
}
