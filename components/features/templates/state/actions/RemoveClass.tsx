'use client';

import React from 'react';

/**
 * RemoveClass Component - Remove a CSS class from an element
 *
 * Action component that removes a CSS class from target element(s).
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <RemoveClass target="this" class="active" />
 *     <RemoveClass target="#sidebar" class="open" />
 *   </OnClick>
 *   Remove Classes
 * </Button>
 * ```
 */

export interface RemoveClassProps {
  /** CSS selector or "this" for current element */
  target: string;

  /** Class name to remove */
  className: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function RemoveClass(props: RemoveClassProps) {
  const { __visualBuilder, _isInVisualBuilder } = props;
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-mono">
        ➖ RemoveClass: {props.target} → {props.className}
      </div>
    );
  }

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute RemoveClass action
 * Called by event handlers (OnClick, etc.)
 */
export function executeRemoveClassAction(props: RemoveClassProps, currentElement?: HTMLElement): void {
  const { target, className } = props;

  if (!target || !className) {
    console.warn('[RemoveClass] Missing target or className prop');
    return;
  }

  // Resolve target element(s)
  const elements = resolveTarget(target, currentElement);

  if (elements.length === 0) {
    console.warn(`[RemoveClass] No elements found for target: ${target}`);
    return;
  }

  // Remove class from all matched elements
  elements.forEach((el) => {
    el.classList.remove(className);
  });

  console.log(`[RemoveClass] Removed class "${className}" from ${elements.length} element(s)`);
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
          console.log(`[RemoveClass] Found elements with prefixed selector: ${prefixedSelector}`);
        }
      }
    }

    return Array.from(elements) as HTMLElement[];
  } catch (error) {
    console.error(`[RemoveClass] Invalid selector: ${target}`, error);
    return [];
  }
}
