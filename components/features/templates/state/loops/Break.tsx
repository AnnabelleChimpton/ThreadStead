'use client';

import React from 'react';

/**
 * Break Component - Exit ForEach loop early
 *
 * Must be used inside a ForEach loop.
 * Exits the loop early, skipping remaining iterations.
 *
 * @example Unconditional break
 * ```xml
 * <ForEach var="items" item="item" index="i">
 *   <div>{item.name}</div>
 *   <If condition="$vars.i" greaterThanOrEqual="5">
 *     <Break />
 *   </If>
 * </ForEach>
 * ```
 *
 * @example Conditional break
 * ```xml
 * <ForEach var="items" item="item">
 *   <Break when="item.error === true" />
 *   <div>{item.name}</div>
 * </ForEach>
 * ```
 */

export interface BreakProps {
  /** Optional inner condition (e.g., "i >= 5") - uses scoped variables */
  when?: string;

  /** Optional outer condition (e.g., "$vars.enabled") - uses global variables */
  condition?: string;

  /** Internal: Scoped variable resolution (injected by ForEach) */
  scopeId?: string;

  /** Children (ignored - Break is an action component) */
  children?: React.ReactNode;
}

export default function Break(props: BreakProps) {
  // Normal mode - Break is a passive marker component
  // ForEach will pre-process Break components before rendering
  // This component doesn't need to do anything at runtime
  return null;
}
