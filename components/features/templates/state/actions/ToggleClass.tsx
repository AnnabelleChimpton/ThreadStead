'use client';

import React from 'react';
import { pageElements } from './page-targets';

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
}

export default function ToggleClass(props: ToggleClassProps) {

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

  // Only the page's own elements, never the site around it
  return pageElements(target);
}
