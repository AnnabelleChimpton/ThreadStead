'use client';

import React, { useMemo } from 'react';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';

/**
 * If Component - Universal conditional component
 *
 * Works in TWO contexts:
 * 1. Conditional Rendering - Show/hide content based on conditions
 * 2. Conditional Actions - Execute actions inside event handlers (OnClick, etc.)
 *
 * @example
 * ```xml
 * <!-- Conditional Rendering -->
 * <If condition="isLoggedIn">
 *   <p>Welcome back!</p>
 * </If>
 *
 * <!-- Conditional Actions -->
 * <Button>
 *   <OnClick>
 *     <If condition="counter < 10">
 *       <Increment var="counter" />
 *     </If>
 *   </OnClick>
 * </Button>
 *
 * <!-- If/ElseIf/Else chains (actions only) -->
 * <Button>
 *   <OnClick>
 *     <If condition="counter < 10">
 *       <Increment var="counter" />
 *     </If>
 *     <ElseIf condition="counter == 10">
 *       <Set var="counter" value="0" />
 *     </ElseIf>
 *     <Else>
 *       <ShowToast message="Max reached!" />
 *     </Else>
 *   </OnClick>
 * </Button>
 * ```
 */

export interface IfProps {
  // Data path to check (used with operators or for truthy check)
  condition?: string;
  data?: string; // Alias for condition
  when?: string; // Alternative alias

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

  // Internal: Scoped variable resolution (injected by ForEach)
  scopeId?: string;

  // Content to render or actions to execute if condition is true
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

/**
 * PHASE 1.1: Extract variable names from condition strings
 * Finds all $vars.variableName references in the condition
 */
function extractVariableDependencies(props: IfProps): string[] {
  const deps = new Set<string>();
  const varRegex = /\$vars\.([a-zA-Z0-9_-]+)/g;

  // Check all string props for variable references
  const propsToCheck = [
    props.when,
    props.data,
    props.condition,
    props.equals,
    props.notEquals,
    props.contains,
    props.startsWith,
    props.endsWith,
    props.matches,
    props.not,
    ...(Array.isArray(props.and) ? props.and : props.and ? [props.and] : []),
    ...(Array.isArray(props.or) ? props.or : props.or ? [props.or] : [])
  ];

  for (const prop of propsToCheck) {
    if (typeof prop === 'string') {
      let match;
      while ((match = varRegex.exec(prop)) !== null) {
        deps.add(match[1]); // Add variable name without $vars. prefix
      }
    }
  }

  return Array.from(deps);
}

export default function If(props: IfProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder,
    scopeId,
    condition,
    data,
    when,
    ...conditionProps
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;
  const residentData = useResidentData();

  // PHASE 1.1: Extract variable dependencies and use selective subscription
  const dependencies = useMemo(() => extractVariableDependencies(props), [
    props.when,
    props.data,
    props.condition,
    props.equals,
    props.notEquals,
    props.contains,
    props.startsWith,
    props.endsWith,
    props.matches,
    props.not,
    props.and,
    props.or
  ]);

  const templateState = useTemplateStateWithDeps(dependencies);

  // P1.4: Memoize condition config building to avoid recreating on every render
  const config: ConditionConfig = useMemo(() => ({
    ...(condition || data || when ? { data: condition || data || when } : {}),
    ...conditionProps
  } as ConditionConfig), [
    condition,
    data,
    when,
    conditionProps.equals,
    conditionProps.notEquals,
    conditionProps.greaterThan,
    conditionProps.lessThan,
    conditionProps.greaterThanOrEqual,
    conditionProps.lessThanOrEqual,
    conditionProps.contains,
    conditionProps.startsWith,
    conditionProps.endsWith,
    conditionProps.matches,
    conditionProps.exists,
    conditionProps.and,
    conditionProps.or,
    conditionProps.not
  ]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const conditionDisplay = props.condition || props.data || props.when || 'condition';
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

  // Normal mode - evaluate condition and render conditionally
  // Evaluate condition using centralized engine
  // Pass scopeId for ForEach loop variable resolution
  const shouldShow = evaluateFullCondition(config, residentData, scopeId);

  // Return children if condition is true, null otherwise
  // NOTE: ActionExecutor will still intercept If components inside event handlers
  // and handle them specially for If/ElseIf/Else chains
  return shouldShow ? <>{children}</> : null;
}

/**
 * Evaluate If condition
 * Called by event handlers to determine if child actions should execute
 *
 * @param props If component props
 * @param residentData Resident data context
 * @param forEachContext ForEach loop context for scoped variables
 * @returns true if condition is met, false otherwise
 */
export function evaluateIfCondition(
  props: IfProps,
  residentData: any,
  forEachContext?: { scopeId?: string } | null
): boolean {
  const { condition, data, ...rest } = props;

  // Build condition config
  const config: ConditionConfig = {
    ...(condition || data ? { data: condition || data } : {}),
    ...rest
  } as ConditionConfig;

  // Use centralized condition evaluator with scoped variable support
  const scopeId = forEachContext?.scopeId;
  return evaluateFullCondition(config, residentData, scopeId);
}
