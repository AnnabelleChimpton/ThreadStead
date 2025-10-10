'use client';

import React, { useMemo } from 'react';
import { useResidentData } from '../ResidentDataProvider';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';

interface ShowProps {
  // Simple condition expressions
  when?: string;
  data?: string;
  condition?: string;  // Alias for data/when

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
  and?: string | string[]; // comma-separated paths or array
  or?: string | string[];  // comma-separated paths or array
  not?: string;

  // Internal: Scoped variable resolution (injected by ForEach)
  scopeId?: string;

  children: React.ReactNode;
}

/**
 * PHASE 1.1: Extract variable names from condition strings
 * Finds all $vars.variableName references in the condition
 */
function extractVariableDependencies(props: ShowProps): string[] {
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

/**
 * Show Component - Conditionally render content based on data
 *
 * @example
 * // Simple truthy check
 * <Show data="posts">
 *   <BlogPosts />
 * </Show>
 *
 * @example
 * // Comparison operators
 * <Show data="posts.length" greaterThan="5">
 *   <p>You have many posts!</p>
 * </Show>
 *
 * @example
 * // Logical AND
 * <Show and="posts,capabilities.bio">
 *   <RichProfile />
 * </Show>
 *
 * @example
 * // String operators
 * <Show data="owner.handle" startsWith="admin">
 *   <AdminBadge />
 * </Show>
 */
export default function Show(props: ShowProps) {
  const { children, scopeId, condition, ...conditionProps } = props;
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

  // Build condition config from props
  // Map 'condition' prop to 'data' for the evaluator
  const config: ConditionConfig = {
    ...(condition ? { data: condition } : {}),
    ...conditionProps
  } as ConditionConfig;

  // Evaluate condition using centralized engine
  // Pass scopeId for ForEach loop variable resolution
  const shouldShow = evaluateFullCondition(config, residentData, scopeId);

  return shouldShow ? <>{children}</> : null;
}
