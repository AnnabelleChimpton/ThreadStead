'use client';

import React from 'react';
import { pageElements } from './page-targets';

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
}

export default function RemoveClass(props: RemoveClassProps) {

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

  // Only the page's own elements, never the site around it
  return pageElements(target);
}
