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
 * @example Stop after ten items
 * ```xml
 * <ForEach var="items" item="item">
 *   <Break when="i >= 10" />
 *   <div>{item.name}</div>
 * </ForEach>
 * ```
 *
 * `when` only compares the loop count (`i` or `index`) with a number. To
 * stop on anything else, put <Break /> inside an <If>, as in the first example.
 */

export interface BreakProps {
  /** The loop count compared with a number, like "i >= 5" (the compiler warns about anything else) */
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
