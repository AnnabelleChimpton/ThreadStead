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
 * `when` is a calculation on the loop's item and place (`i`, `index`, or the
 * names the ForEach gives them) and the page's Vars, like `item.done` or
 * `i >= 5`; `condition` one on the page's Vars alone, like `$vars.limit > 3`.
 */

export interface BreakProps {
  /** A calculation on this item, its place and the page's Vars, like "i >= 5" or "item.done" */
  when?: string;

  /** A calculation on the page's Vars alone, like "$vars.enabled" or "$vars.limit > 3" */
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
