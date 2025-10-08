'use client';

import React from 'react';

/**
 * AddClass Component - Add a CSS class to an element
 *
 * Action component that adds a CSS class to target element(s).
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <AddClass target="this" class="active" />
 *     <AddClass target="#sidebar" class="open" />
 *     <AddClass target=".items" class="highlighted" />
 *   </OnClick>
 *   Toggle Classes
 * </Button>
 * ```
 */

export interface AddClassProps {
  /** CSS selector or "this" for current element */
  target: string;

  /** Class name to add */
  className: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function AddClass(props: AddClassProps) {
  const { __visualBuilder, _isInVisualBuilder } = props;
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-sky-100 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-700 rounded text-xs text-sky-700 dark:text-sky-300 font-mono">
        ➕ AddClass: {props.target} → {props.className}
      </div>
    );
  }

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute AddClass action
 * Called by event handlers (OnClick, etc.)
 */
export function executeAddClassAction(props: AddClassProps, currentElement?: HTMLElement): void {
  const { target, className } = props;

  if (!target || !className) {
    console.warn('[AddClass] Missing target or className prop');
    return;
  }

  // Resolve target element(s)
  const elements = resolveTarget(target, currentElement);

  if (elements.length === 0) {
    console.warn(`[AddClass] No elements found for target: ${target}`);
    return;
  }

  // Add class to all matched elements
  elements.forEach((el) => {
    el.classList.add(className);
  });

  console.log(`[AddClass] Added class "${className}" to ${elements.length} element(s)`);
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
        if (elements.length > 0) {
          console.log(`[AddClass] Found elements with prefixed selector: ${prefixedSelector}`);
        }
      }
    }

    return Array.from(elements) as HTMLElement[];
  } catch (error) {
    console.error(`[AddClass] Invalid selector: ${target}`, error);
    return [];
  }
}
