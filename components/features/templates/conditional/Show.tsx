'use client';

import React from 'react';
import { useResidentData } from '../ResidentDataProvider';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';

interface ShowProps {
  // Simple condition expressions
  when?: string;
  data?: string;

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

  children: React.ReactNode;
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
  const { children, ...conditionProps } = props;
  const residentData = useResidentData();
  const templateState = useTemplateState();

  // Build condition config from props
  const config: ConditionConfig = conditionProps as ConditionConfig;

  // Evaluate condition using centralized engine
  // Pass residentData as the data context - condition evaluator will access template state via getGlobalTemplateState()
  const shouldShow = evaluateFullCondition(config, residentData);

  // ALTERNATIVE: If template state is not accessible via global, we could merge it into data
  // const dataWithVars = { ...residentData, $vars: templateState?.variables };
  // const shouldShow = evaluateFullCondition(config, dataWithVars);

  return shouldShow ? <>{children}</> : null;
}
