'use client';

import React, { useEffect } from 'react';
import { useSwitchContext } from './Switch';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';

/**
 * Case Component - Pattern match branch
 *
 * Child of Switch component. Executes its children if:
 * 1. No previous Case has matched
 * 2. This Case's value matches the Switch value OR its condition is true
 *
 * @example With direct value
 * ```xml
 * <Switch value="$vars.status">
 *   <Case value="pending">
 *     <Set var="icon" value="⏳" />
 *   </Case>
 *   <Case value="approved">
 *     <Set var="icon" value="✅" />
 *   </Case>
 * </Switch>
 * ```
 *
 * @example With condition
 * ```xml
 * <Switch value="$vars.score">
 *   <Case when="$vars.score" greaterThanOrEqual="90">
 *     <Set var="grade" value="A" />
 *   </Case>
 *   <Case when="$vars.score" greaterThanOrEqual="80">
 *     <Set var="grade" value="B" />
 *   </Case>
 * </Switch>
 * ```
 */

export interface CaseProps {
  /** Value to match against Switch value (exact comparison) */
  value?: string | number | boolean;

  /** Condition expression to evaluate (uses condition-evaluator) */
  when?: string;

  // Conditional operators (when using 'when' prop)
  equals?: string;
  notEquals?: string;
  greaterThan?: string | number;
  lessThan?: string | number;
  greaterThanOrEqual?: string | number;
  lessThanOrEqual?: string | number;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string;
  exists?: string | boolean;
  and?: string | string[];
  or?: string | string[];
  not?: string;

  /** Actions to execute if this case matches */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Case(props: CaseProps) {
  const {
    value,
    when,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const switchContext = useSwitchContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;
  const residentData = useResidentData();

  // Evaluate if this Case matches (before any early returns)
  const matches = switchContext && !switchContext.hasMatched
    ? evaluateCaseCondition(
        props,
        switchContext,
        residentData,
        null // forEachContext not available in rendering mode
      )
    : false;

  // Update switch context if this case matches (hook must be called unconditionally)
  useEffect(() => {
    if (matches && switchContext && !switchContext.hasMatched) {
      switchContext.setMatched(true);
    }
  }, [matches, switchContext]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayValue = value !== undefined
      ? `== ${value}`
      : when
        ? `when ${when}`
        : 'condition';

    const operators = [];
    if (props.equals) operators.push(`== ${props.equals}`);
    if (props.notEquals) operators.push(`!= ${props.notEquals}`);
    if (props.greaterThan) operators.push(`> ${props.greaterThan}`);
    if (props.lessThan) operators.push(`< ${props.lessThan}`);
    if (props.greaterThanOrEqual) operators.push(`>= ${props.greaterThanOrEqual}`);
    if (props.lessThanOrEqual) operators.push(`<= ${props.lessThanOrEqual}`);

    return (
      <div className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
        📌 Case: {displayValue} {operators.join(' ')}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-blue-400 dark:border-blue-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - evaluate and conditionally render
  // Return null if no switch context (used outside Switch)
  if (!switchContext) {
    console.warn('[Case] Used outside of Switch component');
    return null;
  }

  // Return null if a previous Case already matched
  if (switchContext.hasMatched) {
    return null;
  }

  // Render children if this case matches
  return matches ? <>{children}</> : null;
}

/**
 * Evaluate Case condition
 * Called by event handlers to determine if this Case matches
 *
 * @param props Case component props
 * @param switchContext Switch context with switch value
 * @param residentData Resident data for condition evaluation
 * @param forEachContext ForEach loop context for scoped variables
 * @returns true if this case matches, false otherwise
 */
export function evaluateCaseCondition(
  props: CaseProps,
  switchContext: { switchValue: any; hasMatched: boolean } | null,
  residentData: any,
  forEachContext?: { scopeId?: string } | null
): boolean {
  // If no switch context, can't evaluate
  if (!switchContext) {
    console.warn('[Case] Used outside of Switch component');
    return false;
  }

  // If a previous Case already matched, don't evaluate
  if (switchContext.hasMatched) {
    return false;
  }

  const { value, when, ...conditionOperators } = props;

  // Option 1: Direct value comparison
  if (value !== undefined) {
    // Use loose equality to allow "1" === 1
    // eslint-disable-next-line eqeqeq
    return switchContext.switchValue == value;
  }

  // Option 2: Condition expression
  if (when || Object.keys(conditionOperators).length > 0) {
    // Build condition config
    const config: ConditionConfig = {
      ...(when ? { data: when } : {}),
      ...conditionOperators
    } as ConditionConfig;

    // Use centralized condition evaluator
    const scopeId = forEachContext?.scopeId;
    return evaluateFullCondition(config, residentData, scopeId);
  }

  // No matching criteria provided
  console.warn('[Case] No value or when condition provided');
  return false;
}
