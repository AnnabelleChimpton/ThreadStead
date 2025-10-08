'use client';

import React from 'react';

/**
 * ToggleClass Component - Toggle a CSS class on an element
 *
 * Action component that toggles a CSS class on target element(s).
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <ToggleClass target="this" class="active" />
 *     <ToggleClass target="#sidebar" class="open" />
 *   </OnClick>
 *   Toggle Classes
 * </Button>
 * ```
 */

export interface ToggleClassProps {
  /** CSS selector or "this" for current element */
  target: string;

  /** Class name to toggle */
  className: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function ToggleClass(props: ToggleClassProps) {
  const { __visualBuilder, _isInVisualBuilder } = props;
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 rounded text-xs text-violet-700 dark:text-violet-300 font-mono">
        🔄 ToggleClass: {props.target} → {props.className}
      </div>
    );
  }

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute ToggleClass action
 * Called by event handlers (OnClick, etc.)
 */
export function executeToggleClassAction(props: ToggleClassProps, currentElement?: HTMLElement): void {
  const { target, className } = props;

  if (!target || !className) {
    return;
  }

  // Resolve target element(s)
  const elements = resolveTarget(target, currentElement);

  if (elements.length === 0) {
    return;
  }

  // Toggle class on all matched elements
  elements.forEach((el) => {
    el.classList.toggle(className);
  });

}

/**
 * Resolve target selector to DOM elements
 * Handles automatic user-content- prefix for ID selectors
 */
function resolveTarget(target: string, currentElement?: HTMLElement): HTMLElement[] {
  // Special case: "this" refers to the current element
  if (target === 'this' && currentElement) {
    return [currentElement];
  }

  // Query selector with automatic prefix handling for IDs
  try {
    let elements = document.querySelectorAll(target);

    // If no elements found and target is an ID selector, try with user-content- prefix
    // (rehype-sanitize automatically prefixes IDs for security)
    if (elements.length === 0 && target.startsWith('#')) {
      const idWithoutHash = target.substring(1);
      if (!idWithoutHash.startsWith('user-content-')) {
        const prefixedSelector = `#user-content-${idWithoutHash}`;
        elements = document.querySelectorAll(prefixedSelector);
      }
    }

    return Array.from(elements) as HTMLElement[];
  } catch (error) {
    return [];
  }
}
