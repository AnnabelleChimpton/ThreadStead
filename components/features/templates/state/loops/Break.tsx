'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useForEachContext } from './ForEach';

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

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Internal: Scoped variable resolution (injected by ForEach) */
  scopeId?: string;

  /** Children (ignored - Break is an action component) */
  children?: React.ReactNode;
}

export default function Break(props: BreakProps) {
  const {
    when,
    condition: outerCondition,
    scopeId,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const forEachContext = useForEachContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const conditions = [];
    if (outerCondition) conditions.push(`condition: ${outerCondition}`);
    if (when) conditions.push(`when: ${when}`);
    const displayCondition = conditions.length > 0 ? conditions.join(' AND ') : 'unconditional';

    return (
      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-mono">
        🛑 Break ({displayCondition})
      </div>
    );
  }

  // Normal mode - Break is a passive marker component
  // ForEach will pre-process Break components before rendering
  // This component doesn't need to do anything at runtime
  return null;
}
